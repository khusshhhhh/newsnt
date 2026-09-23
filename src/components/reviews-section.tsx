"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { submitReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HoneypotField } from "@/components/honeypot-field";
import type { Review } from "@/lib/supabase/types";

function Stars({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(size, n <= rating ? "fill-foreground text-foreground" : "text-border")}
        />
      ))}
    </div>
  );
}

export function ReviewsSection({ productId, reviews }: { productId: string; reviews: Review[] }) {
  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  return (
    <div className="mt-10 border-t border-border pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-medium text-foreground">Reviews</h2>
          {average != null && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Stars rating={Math.round(average)} />
              {average.toFixed(1)} ({reviews.length})
            </span>
          )}
        </div>
        <WriteReviewDialog productId={productId} />
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{review.reviewer_name}</span>
                <Stars rating={review.rating} size="size-3.5" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WriteReviewDialog({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitReview(null, formData);
      if (result.success) {
        toast.success("Thanks — your review is in for approval.");
        formRef.current?.reset();
        setRating(5);
        setOpen(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
        Write a review
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Write a review</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="rating" value={rating} />
          <HoneypotField />
          <div className="flex flex-col gap-1.5">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className="p-0.5"
                >
                  <Star className={cn("size-6", n <= rating ? "fill-foreground text-foreground" : "text-border")} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-name">Name</Label>
            <Input id="review-name" name="reviewer_name" required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-email">Email</Label>
            <Input id="review-email" name="reviewer_email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-body">Your review</Label>
            <Textarea id="review-body" name="body" required rows={4} />
          </div>
          <p className="text-xs text-muted-foreground">
            Reviews are checked before they go live — yours will appear once approved.
          </p>
          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "Sending…" : "Submit review"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
