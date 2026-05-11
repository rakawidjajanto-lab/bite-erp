import { z } from "zod";

export const padelSaleSchema = z.object({
  venueId: z.string().min(1, "Venue is required"),
  saleDate: z.string().min(1, "Date is required"),
  sales: z
    .array(
      z.object({
        flavorId: z.string().min(1),
        quantitySold: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().positive(),
      })
    )
    .min(1, "At least one flavor must be logged"),
  notes: z.string().optional(),
});

export const padelDeliverySchema = z.object({
  venueId: z.string().min(1, "Venue is required"),
  deliveryDate: z.string().min(1, "Date is required"),
  items: z
    .array(
      z.object({
        flavorId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().positive(),
      })
    )
    .min(1, "At least one item must be added"),
  notes: z.string().optional(),
});

export type PadelSaleFormValues = z.infer<typeof padelSaleSchema>;
export type PadelDeliveryFormValues = z.infer<typeof padelDeliverySchema>;
