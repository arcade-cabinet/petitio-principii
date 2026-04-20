import { render } from "solid-js/web";
import "./ui/styles/theme.css";
import "./ui/styles/crt.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
render(() => <App />, root);
