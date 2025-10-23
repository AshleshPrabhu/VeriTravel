import { useEffect, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type HotelDetails = {
  name: string;
  location: string;
  pricePerNight: string;
  rating: string;
  description: string;
};

type HotelDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: HotelDetails;
  onSubmit?: (values: HotelDetails) => void;
  title?: string;
  submitLabel?: string;
};

const defaultValues: HotelDetails = {
  name: "",
  location: "",
  pricePerNight: "",
  rating: "",
  description: "",
};

export function HotelDetailsDialog({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  title = "Hotel Listing Details",
  submitLabel = "Save",
}: HotelDetailsDialogProps) {
  const [formValues, setFormValues] = useState<HotelDetails>(defaultValues);

  useEffect(() => {
    if (open) {
      setFormValues(initialValues ?? defaultValues);
    }
  }, [open, initialValues]);

  const handleChange = (field: keyof HotelDetails) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const payload = {
      ...defaultValues,
      ...formValues,
    };
    onSubmit?.(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl border border-black/10 bg-[#F6F1DF] p-8 shadow-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.22em] text-neutral-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-600">
            Provide or update the core details of the hotel listing shown to guests.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="hotel-name" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
              Hotel name
            </Label>
            <Input
              id="hotel-name"
              value={formValues.name}
              onChange={handleChange("name")}
              placeholder="Aurora Skyline Residency"
              className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel-location" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
              Location
            </Label>
            <Input
              id="hotel-location"
              value={formValues.location}
              onChange={handleChange("location")}
              placeholder="Lisbon, Portugal"
              className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hotel-price" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Price per night
              </Label>
              <Input
                id="hotel-price"
                value={formValues.pricePerNight}
                onChange={handleChange("pricePerNight")}
                placeholder="1.20 ETH"
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hotel-rating" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Rating
              </Label>
              <Input
                id="hotel-rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formValues.rating}
                onChange={handleChange("rating")}
                placeholder="4.6"
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel-description" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
              Description
            </Label>
            <Textarea
              id="hotel-description"
              value={formValues.description}
              onChange={handleChange("description")}
              placeholder="Panoramic city views with curated concierge services for every guest."
              className="min-h-[110px] rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>
        </div>

        <DialogFooter className="mt-8 flex flex-row justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-black/12 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700 hover:bg-[#EDE4CB]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-black px-7 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white hover:bg-black/90"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
