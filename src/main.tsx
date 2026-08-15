import React from "react";
import ReactDOM from "react-dom/client";
import { AscentApp } from "../app/components/AscentApp";
import { PortfolioProvider } from "../app/store/portfolio-store";
import { ConfirmationProvider } from "../app/components/ConfirmationDialog";
import "../app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PortfolioProvider><ConfirmationProvider><AscentApp /></ConfirmationProvider></PortfolioProvider>
  </React.StrictMode>,
);
