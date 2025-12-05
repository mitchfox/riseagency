import React from "react";

interface HoverTextProps {
  text: string;
  className?: string;
}

export const HoverText: React.FC<HoverTextProps> = ({ text, className = "" }) => {
  const renderLetters = (isClone: boolean = false) => (
    text.split("").map((letter, index) => (
      <span
        key={`${isClone ? 'clone-' : ''}${index}`}
        className={isClone ? "hover-text-letter-clone" : "hover-text-letter"}
        style={{ transitionDelay: `${index * 50}ms` }}
      >
        {letter === " " ? "\u00A0" : letter}
      </span>
    ))
  );

  return (
    <span className={`hover-text-wrapper ${className}`}>
      <span className="hover-text-original">
        {renderLetters(false)}
      </span>
      <span className="hover-text-clone" aria-hidden="true">
        {renderLetters(true)}
      </span>
    </span>
  );
};
