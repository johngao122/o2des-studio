"use client";

import { MathJaxContext } from "better-react-mathjax";
import { ReactNode } from "react";

const mathJaxConfig = {
    loader: { load: ["[tex]/html"] },
    tex: {
        packages: { "[+]": ["html"] },
        inlineMath: [["$", "$"]],
        displayMath: [["$$", "$$"]],
    },
};

export default function MathJaxProvider({ children }: { children: ReactNode }) {
    return <MathJaxContext config={mathJaxConfig}>{children}</MathJaxContext>;
}
