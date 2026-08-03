# Checkout prints via preview; cart resets only on explicit finish

The counter flow is: Enregistrer saves the sale atomically → a receipt preview opens (same template as print) → the user picks "Imprimer" (Electron), "Imprimer via navigateur", or "Terminer la vente". The cart and form reset only on "Terminer la vente".

This deliberately departs from typical POS instant-print checkout: the owner wants to see the receipt before it prints, and browser printing cannot report success/cancellation, so auto-clearing the cart on print attempt would risk losing or confusing sale state. The sale is always safe — a closed preview or failed print never loses it.
