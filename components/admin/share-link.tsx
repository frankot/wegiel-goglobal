"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareLink({ url, emailSent }: { url: string; emailSent?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input readOnly value={url} aria-label="Link aktywacyjny" className="flex-1 font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Skopiowano" : "Kopiuj link"}
        </Button>
      </div>
      {emailSent && (
        <p className="text-xs text-muted-foreground">
          Ten sam link jest w wysłanym e-mailu. Możesz go też przekazać inną drogą, np. w wiadomości.
        </p>
      )}
    </div>
  );
}
