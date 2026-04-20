import { render } from "solid-js/web";
import "./design/theme.css";
import "./design/crt.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
render(() => <App />, root);
