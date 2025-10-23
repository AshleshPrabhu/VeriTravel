// AnimatedButton.tsx

"use client";
import "./AnimatedButton.css";
import React, { useRef } from "react";

// GSAP and its plugins
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Icons
import { IoMdArrowForward } from "react-icons/io";

// Register the GSAP plugin
gsap.registerPlugin(SplitText);

// Define the component's props with TypeScript
interface AnimatedButtonProps {
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  delay?: number;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  label,
  onClick,
  delay = 0,
}) => {
  // Define refs with TypeScript types
  const buttonRef = useRef<HTMLButtonElement>(null);
  const circleRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  
  // A ref to hold the SplitText instance for proper cleanup
  const splitRef = useRef<SplitText | null>(null);

  useGSAP(
    () => {
      // Ensure all refs are available
      if (!buttonRef.current || !textRef.current || !circleRef.current || !iconRef.current) {
        return;
      }

      // Create the SplitText animation for the text reveal
      const split = SplitText.create(textRef.current, {
        type: "lines",
        linesClass: "line", // Use the class defined in your CSS
      });
      splitRef.current = split; // Store instance for cleanup

      // Set initial states for the animation
      gsap.set(buttonRef.current, { scale: 0, transformOrigin: "center" });
      gsap.set(circleRef.current, { scale: 0, opacity: 0, transformOrigin: "center" });
      gsap.set(iconRef.current, { opacity: 0, x: -20 });
      gsap.set(split.lines, { y: "100%", opacity: 0 }); // Text is initially hidden

      // Create the main animation timeline
      const tl = gsap.timeline({ delay: delay });

      tl.to(buttonRef.current, {
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
      });

      tl.to(
        circleRef.current,
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
        },
        "+0.25"
      );

      tl.to(
        iconRef.current,
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        "-0.25"
      );

      // Add the text animation back into the timeline
      tl.to(
        split.lines,
        {
          y: "0%",
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power4.out",
        },
        "-=0.2"
      );

      // Cleanup function to revert SplitText on component unmount
      return () => {
        if (splitRef.current) {
          splitRef.current.revert();
        }
      };
    },
    { scope: buttonRef, dependencies: [delay] }
  );

  return (
    <button className="btn" ref={buttonRef} onClick={onClick}>
      <span className="circle" ref={circleRef} aria-hidden="true"></span>
      <div className="icon" ref={iconRef}>
        <IoMdArrowForward />
      </div>
      <span className="button-text" ref={textRef}>
        {label}
      </span>
    </button>
  );
};

export default AnimatedButton;
