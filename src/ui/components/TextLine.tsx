interface TextLineProps {
  text: string;
  className?: string;
}

export function TextLine({ text, className = "" }: TextLineProps) {
  if (text === "") {
    return <div className={`text-line empty ${className}`}>&nbsp;</div>;
  }
  if (text.startsWith("---") && text.endsWith("---")) {
    return <div className={`text-line room-title ${className}`}>{text}</div>;
  }
  if (text.startsWith(">")) {
    return <div className={`text-line user-input ${className}`}>{text}</div>;
  }
  return <div className={`text-line ${className}`}>{text}</div>;
}
