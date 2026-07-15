import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CadastroPublico from "./components/CadastroPublico";
import "./index.css";

const Root = window.location.pathname === "/cadastro" ? CadastroPublico : App;

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
