import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { HomePage } from "@/pages/HomePage";
import { ExpensesPage } from "@/pages/ExpensesPage";
import { Layout } from "@/components/Layout";
const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/expenses",
        element: <ExpensesPage />,
      },
      // {
      //   path: "/demopage",
      //   element: <DemoPage />,
      // },
    ],
  },
]);
export function App() {
  return <RouterProvider router={router} />;
}
