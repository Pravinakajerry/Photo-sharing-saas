import Image, { ImageProps } from "next/image";
import { type FC } from "react";
import { CopyX } from "lucide-react";

interface SafeImageProps extends Omit<ImageProps, "src"> {
    src?: string | null | undefined;
    fallbackIcon?: React.ReactNode;
}

export const SafeImage: FC<SafeImageProps> = ({ src, alt, fallbackIcon, ...props }) => {
    // If we have a valid source, render the Next.js Image component natively.
    if (src && typeof src === "string" && src.trim() !== "") {
        return <Image src={src} alt={alt || "Image"} {...props} />;
    }

    // Determine the sizing classes to apply to the fallback container.
    // If fill is true, we want it to expand. Otherwise, we match the w/h.
    const containerClasses = props.fill
        ? "absolute inset-0 w-full h-full"
        : "";

    // If there's no src, render a fallback container that matches the expected dimensions
    return (
        <div
            className={`flex items-center justify-center bg-[#e8e7e5]/50 overflow-hidden ${containerClasses} ${props.className || ""}`}
            style={
                !props.fill
                    ? { width: props.width, height: props.height }
                    : undefined
            }
        >
            {fallbackIcon || (
                <CopyX className="text-muted-foreground/40 w-1/3 h-1/3 max-w-[48px] max-h-[48px]" />
            )}
        </div>
    );
};
