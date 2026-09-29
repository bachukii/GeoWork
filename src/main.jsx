import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Site from "./site/Site";
import "./styles.css";
import "./site/site.css";

// /app — შეკვეთების აპი (ჯერ დამალულია). დანარჩენი — საჯარო საიტი.
const isApp = window.location.pathname === "/app" || window.location.pathname.startsWith("/app/");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isApp ? <App /> : <Site />}
  </React.StrictMode>
);
