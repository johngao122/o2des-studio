"use client";

import { MathJaxContext } from "better-react-mathjax";
import { ReactNode } from "react";
import dynamic from "next/dynamic";

const mathJaxConfig = {
    loader: { load: ["[tex]/html"] },
    tex: {
        packages: { "[+]": ["html"] },
        inlineMath: [["$", "$"]],
        displayMath: [["$$", "$$"]],
    },
};

function MathJaxProviderInner({ children }: { children: ReactNode }) {
    return <MathJaxContext config={mathJaxConfig}>{children}</MathJaxContext>;
}

const MathJaxProvider = dynamic(() => Promise.resolve(MathJaxProviderInner), {
    ssr: false,
});

export default MathJaxProvider;
