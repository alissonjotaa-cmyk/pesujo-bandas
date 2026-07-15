import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CadastroPublico from "./components/CadastroPublico";
import ConvitePublico from "./components/ConvitePublico";
import MarketingPublico from "./components/MarketingPublico";
import "./index.css";

const path = window.location.pathname;
const conviteMatch = path.match(/^\/convite\/(.+)/);

let Root;
if (path === "/cadastro") Root = CadastroPublico;
else if (conviteMatch) Root = () => <ConvitePublico id={conviteMatch[1]} />;
else if (path === "/marketing") Root = MarketingPublico;
else Root = App;

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
