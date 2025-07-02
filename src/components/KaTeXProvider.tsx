"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";

import "katex/dist/katex.min.css";

function KaTeXProviderInner({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

const KaTeXProvider = dynamic(() => Promise.resolve(KaTeXProviderInner), {
    ssr: false,
});

export default KaTeXProvider;
