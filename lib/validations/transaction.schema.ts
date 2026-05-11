import { z } from "zod";

export const transactionSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    description: z.string().min(1, "Description is required"),
    category: z.enum([
      "INVESTMENT",
      "SALES",
      "SUPPLIES",
      "OPERATIONAL",
      "MARKETING",
      "RND",
      "INVENTORY",
      "OTHER_INCOME",
    ]),
    type: z.enum(["in", "out"]),
    amount: z.coerce
      .number({ invalid_type_error: "Amount must be a number" })
      .positive("Amount must be greater than 0"),
    investmentDirection: z.enum(["IN", "OUT"]).optional(),
    investorName: z.string().optional(),
    source: z
      .enum(["MANUAL", "TOKOPEDIA", "SHOPEE", "PADEL", "EXCEL_IMPORT"])
      .default("MANUAL"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.category === "INVESTMENT") {
        return !!data.investmentDirection;
      }
      return true;
    },
    {
      message: "Investment direction is required for investment transactions",
      path: ["investmentDirection"],
    }
  );

export type TransactionFormValues = z.infer<typeof transactionSchema>;
