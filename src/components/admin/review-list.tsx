"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { deleteReview, moderateReview } from "@/lib/actions/admin/moderation";
import { productHref, type Department } from "@/lib/department";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/supabase/types";

type ReviewRow = Review & {
  product: { name: string; slug: string; department: Department } | null;
};

export function ReviewList({ reviews }: { reviews: ReviewRow[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing here.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <ReviewRow key={review.id} review={review} />
      ))}
    </ul>
  );
}

function ReviewRow({ review }: { review: ReviewRow }) {
  const [isPending, startTransition] = useTransition();

  function act(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-base text-foreground">{review.reviewer_name}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "size-3.5",
                    n <= review.rating ? "fill-foreground text-foreground" : "text-border"
                  )}
                />
              ))}
            </div>
          </div>
          {review.product && (
            <Link
              href={productHref(review.product)}
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {review.product.name}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          {review.status !== "approved" && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => act(() => moderateReview(review.id, "approved"), "Review approved")}
            >
              Approve
            </Button>
          )}
          {review.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => act(() => moderateReview(review.id, "rejected"), "Review rejected")}
            >
              Reject
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => act(() => deleteReview(review.id), "Review deleted")}
          >
            Delete
          </Button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{review.body}</p>
    </li>
  );
}
