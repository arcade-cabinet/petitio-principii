import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/design/globals.css";
import * as mobile from "@/lib/mobile";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Configure native mobile surface (status bar, splash screen). No-op on web.
// Fire-and-forget — React has already begun rendering above; we don't block
// the first paint on Capacitor plugin resolution.
void mobile.init();
