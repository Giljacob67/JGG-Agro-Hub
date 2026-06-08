import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DetailBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2">
      <Link href={href}>
        <ArrowLeft className="w-3.5 h-3.5" /> {label}
      </Link>
    </Button>
  );
}