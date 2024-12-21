import { NextUIProvider } from "@nextui-org/react";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./css/index.css";
import reportWebVitals from "./reportWebVitals";

// Safely get the root element from the DOM
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Failed to find the 'root' element. Make sure index.html has a <div id='root'></div>."
  );
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <BrowserRouter>
      <NextUIProvider>
        <App />
      </NextUIProvider>
    </BrowserRouter>
  </StrictMode>
);

// Log performance metrics or send them to an analytics endpoint
reportWebVitals(console.log);
