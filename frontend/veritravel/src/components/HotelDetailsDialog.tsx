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
  description: string;
  location: string;
  pricePerNight: string;
  tags: string[];
  images: string[];
  stars: string; // stored as string in the form; consumer can parse as number
  totalRooms: string;
  phone: string;
  email: string;
};

type HotelDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: HotelDetails;
  onSubmit?: (values: HotelDetails) => void;
  title?: string;
  submitLabel?: string;
};

// internal form state keeps tags/images as comma-separated strings for easy editing
type FormState = Omit<HotelDetails, "tags" | "images"> & {
  tagsInput: string;
  imagesInput: string;
};

const defaultValues: FormState = {
  name: "",
  description: "",
  location: "",
  pricePerNight: "",
  tagsInput: "",
  imagesInput: "",
  stars: "",
  totalRooms: "",
  phone: "",
  email: "",
};

export function HotelDetailsDialog({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  title = "Hotel Listing Details",
  submitLabel = "Save",
}: HotelDetailsDialogProps) {
  const [formValues, setFormValues] = useState<FormState>(defaultValues);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setFormValues({
          name: initialValues.name ?? "",
          description: initialValues.description ?? "",
          location: initialValues.location ?? "",
          pricePerNight: initialValues.pricePerNight ?? "",
          tagsInput: (initialValues.tags ?? []).join(", "),
          imagesInput: (initialValues.images ?? []).join(", "),
          stars: initialValues.stars ?? "",
          totalRooms: initialValues.totalRooms ?? "",
          phone: initialValues.phone ?? "",
          email: initialValues.email ?? "",
        });
      } else {
        setFormValues(defaultValues);
      }
    }
  }, [open, initialValues]);

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setFormValues((prev) => ({ ...prev, [field]: value } as FormState));
  };

  const handleSubmit = () => {
    const tags = formValues.tagsInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const images = formValues.imagesInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: HotelDetails = {
      name: formValues.name,
      description: formValues.description,
      location: formValues.location,
      pricePerNight: formValues.pricePerNight,
      tags,
      images,
      stars: formValues.stars,
      totalRooms: formValues.totalRooms,
      phone: formValues.phone,
      email: formValues.email,
    };

    onSubmit?.(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full max-h-[90vh] rounded-3xl border border-black/10 bg-[#F6F1DF] p-8 shadow-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.22em] text-neutral-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-600">
            Provide or update the core details of the hotel listing shown to guests.
          </DialogDescription>
        </DialogHeader>

          <div className="mt-6">
            <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-2 hide-scrollbar">
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
              <Label htmlFor="hotel-stars" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Stars
              </Label>
              <Input
                id="hotel-stars"
                type="number"
                min="0"
                max="5"
                step="1"
                value={formValues.stars}
                onChange={handleChange("stars")}
                placeholder="4"
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hotel-totalRooms" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Total rooms
              </Label>
              <Input
                id="hotel-totalRooms"
                type="number"
                min="1"
                value={formValues.totalRooms}
                onChange={handleChange("totalRooms")}
                placeholder="25"
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel-phone" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Phone
              </Label>
              <Input
                id="hotel-phone"
                type="tel"
                value={formValues.phone}
                onChange={handleChange("phone")}
                placeholder="9999999999"
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel-email" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
              Email
            </Label>
            <Input
              id="hotel-email"
              type="email"
              value={formValues.email}
              onChange={handleChange("email")}
              placeholder="ryan@gmail.com"
              className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
            />
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
