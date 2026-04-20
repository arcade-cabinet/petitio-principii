import { render } from "@solidjs/testing-library";
import { expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import { TerminalScreen } from "../TerminalScreen";

test("renders lines in the terminal", async () => {
  const lines = ["Welcome to the Argument", "Line 2"];
  const onCommand = vi.fn();
  const onNewGame = vi.fn();

  const { getByText } = render(() => (
    <TerminalScreen 
      lines={lines} 
      onCommand={onCommand} 
      onNewGame={onNewGame} 
    />
  ));

  expect(getByText("Welcome to the Argument")).toBeInTheDocument();
  expect(getByText("PETITIO PRINCIPII")).toBeInTheDocument();
});
