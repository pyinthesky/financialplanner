import React from "react";
import ReactDOM from "react-dom/client";

import HomePage from "../app/page";
import "../app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HomePage />
  </React.StrictMode>,
);
