"use client";

import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  white?: boolean;
}

export function BrandLogo({
  className = "flex items-center gap-3",
  imageClassName = "w-10 h-10",
  textClassName = "text-2xl font-extrabold text-[#115e51]",
  white = false,
}: BrandLogoProps) {
  return (
    <div className={className}>
      <img
        src={white ? "/icon-white.png" : "/icon.png"}
        alt="Rumi Logo"
        className={`${imageClassName} object-contain rounded-2xl`}
      />
      <div className="flex flex-col">
        <span className={textClassName}>Rumi</span>
      </div>
    </div>
  );
}
