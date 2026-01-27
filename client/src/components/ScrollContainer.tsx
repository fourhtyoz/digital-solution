import React, { useRef, useEffect } from "react";

interface Props {
    onScrollEnd: () => void;
    children: React.ReactNode;
}
export default function ScrollContainer({ onScrollEnd, children }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handler = () => {
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
                onScrollEnd();
            }
        };
        el.addEventListener("scroll", handler);
        return () => el.removeEventListener("scroll", handler);
    }, [onScrollEnd]);

    return (
        <div ref={ref} className="h-105 overflow-auto rounded border border-slate-300">
            {children}
        </div>
    );
}
