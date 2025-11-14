import os
import time
import io
from PIL import Image
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List, Literal, Dict
from datetime import date
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential


# --- Pydantic Output Schema ---
class LineItem(BaseModel):
    """A single item from the receipt."""
    description: str = Field(description="Item description (e.g., 'Venti Latte', 'Banana 1.5 LB')")
    quantity: float = Field(description="Item quantity. If not specified, assume 1.")
    price: float = Field(description="Total price for this line item (e.g., quantity * unit price).")


Category = Literal["Food & Drink", "Groceries", "Travel", "Shopping", "Utilities", "Other"]


class Receipt(BaseModel):
    """The complete, structured information from a receipt."""
    merchant: str = Field(description="Store or restaurant name (e.g., 'STARBUCKS', 'WALMART')")
    date_time: date = Field(description="Transaction date in YYYY-MM-DD format. Infer from text.")
    total: float = Field(description="Total amount paid (number only, no currency symbols).")
    category: Category = Field(description="Select one category from the allowed list based on the merchant and items.")
    lineItems: List[LineItem] = Field(description="A list of all individual items purchased.")


def rescale_image(image: Image.Image, max_size: int = 1000) -> bytes:
    """Rescale image to max_size x max_size while preserving aspect ratio."""
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Convert to bytes
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()


def parse_receipt_from_image(image: Image.Image, groq_api_key: str = None, verbose: bool = True) -> Dict:
    """
    End-to-end function to parse a receipt from an image with profiling.
    
    Args:
        image: PIL Image object of the receipt
        groq_api_key: Optional GROQ API key. If not provided, will try to load from environment.
        verbose: If True, prints timing information for each step
    
    Returns:
        dict: Dictionary containing 'result' (parsed receipt) and 'profiling' (timing info)
    
    Raises:
        Exception: If OCR or parsing fails
    """
    profiling = {}
    total_start = time.time()
    
    # Step 0: Load environment variables if API key not provided
    step_start = time.time()
    if groq_api_key is None:
        load_dotenv()
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY not found. Please provide it as argument or set it in .env file")
    profiling["0_load_env"] = time.time() - step_start
    
    # Step 1: Perform OCR on the image using Azure Vision
    step_start = time.time()
    
    # Initialize Azure Vision client
    azure_endpoint = os.getenv("AZURE_VISION_ENDPOINT")
    azure_key = os.getenv("AZURE_VISION_KEY")
    if not azure_endpoint or not azure_key:
        raise ValueError("AZURE_VISION_ENDPOINT and AZURE_VISION_KEY must be set in environment variables")
    
    client = ImageAnalysisClient(
        endpoint=azure_endpoint,
        credential=AzureKeyCredential(azure_key)
    )
    
    # Rescale and convert image to bytes
    image_data = rescale_image(image, max_size=1000)
    
    # Perform OCR using Azure Vision
    result = client.analyze(
        image_data=image_data,
        visual_features=[VisualFeatures.READ]
    )
    
    # Extract text from Azure Vision result
    ocr_text = ""
    if result.read is not None:
        for block in result.read.blocks:
            for line in block.lines:
                ocr_text += line.text + "\n"
    
    profiling["1_ocr"] = time.time() - step_start
    
    # Step 2: Initialize LLM
    step_start = time.time()
    try:
        llm = ChatGroq(
            groq_api_key=groq_api_key,
            model="openai/gpt-oss-20b",
            temperature=0.2,
            max_tokens=None,
            reasoning_format="parsed",
            timeout=None,
            max_retries=2,
        )
    except TypeError as e:
        raise e
    profiling["2_init_llm"] = time.time() - step_start
    
    # Step 3: Initialize Output Parser
    step_start = time.time()
    parser = PydanticOutputParser(pydantic_object=Receipt)
    profiling["3_init_parser"] = time.time() - step_start
    
    # Step 4: Load Prompt Templates
    step_start = time.time()
    try:
        with open("system_prompt.txt", "r") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        raise FileNotFoundError("system_prompt.txt not found. Please create it in the working directory.")
    
    try:
        with open("user_prompt.txt", "r") as f:
            user_template_string = f.read()
    except FileNotFoundError:
        raise FileNotFoundError("user_prompt.txt not found. Please create it in the working directory.")
    profiling["4_load_prompts"] = time.time() - step_start
    
    # Step 5: Create the Prompt Template
    step_start = time.time()
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", user_template_string),
    ])
    profiling["5_create_prompt_template"] = time.time() - step_start
    
    # Step 6: Create and run the chain
    step_start = time.time()
    chain = prompt | llm | parser
    profiling["6_create_chain"] = time.time() - step_start
    
    # Step 7: Generate format instructions and invoke
    step_start = time.time()
    try:
        format_instructions = parser.get_format_instructions()
        profiling["7a_get_format_instructions"] = time.time() - step_start
        
        step_start = time.time()
        response = chain.invoke({
            "ocr_text": ocr_text,
            "format_instructions": format_instructions
        })
        profiling["7b_llm_invoke"] = time.time() - step_start
        
        # Convert Pydantic object to dictionary
        step_start = time.time()
        result = response.model_dump()
        profiling["7c_convert_to_dict"] = time.time() - step_start
    
    except Exception as e:
        raise Exception(f"Failed to parse receipt: {e}")
    
    # Total time
    profiling["total"] = time.time() - total_start
    
    # Print profiling information if verbose
    if verbose:
        print("\n" + "="*60)
        print("PROFILING RESULTS")
        print("="*60)
        for key, duration in profiling.items():
            if key != "total":
                print(f"{key:.<40} {duration:.4f}s")
        print("-"*60)
        print(f"{'TOTAL TIME':.<40} {profiling['total']:.4f}s")
        print("="*60 + "\n")
    
    return {
        "result": result,
        "profiling": profiling
    }


def main():
    """Example usage of the parse_receipt_from_image function."""
    print("--- Receipt Parser Example ---\n")
    
    # Example: Load an image and parse it
    image_path = "example2.jpg"
    
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found.")
        print("Please provide a valid receipt image path.")
        return
    
    try:
        # Load image
        img = Image.open(image_path)
        print(f"Loaded image: {image_path}\n")
        
        # Parse receipt with profiling
        print("Processing receipt...")
        response = parse_receipt_from_image(img, verbose=True)
        
        # Print result as JSON
        import json
        print("\n--- Parsed Receipt (JSON) ---")
        print(json.dumps(response["result"], indent=2, default=str))
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
