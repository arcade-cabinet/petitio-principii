import type { Component } from "solid-js";

interface TextLineProps {
  text: string;
  class?: string;
}

export const TextLine: Component<TextLineProps> = (props) => {
  const extra = () => props.class ?? "";

  if (props.text === "") {
    return <div class={`text-line empty ${extra()}`}>&nbsp;</div>;
  }
  if (props.text.startsWith("---") && props.text.endsWith("---")) {
    return <div class={`text-line room-title ${extra()}`}>{props.text}</div>;
  }
  if (props.text.startsWith(">")) {
    return <div class={`text-line user-input ${extra()}`}>{props.text}</div>;
  }
  return <div class={`text-line ${extra()}`}>{props.text}</div>;
};
