import TaxonomyListing from "./TaxonomyListing";
import { ParityTaxonomyListing } from "@/components/parity/ParityTaxonomyListing";

export default function Subcategory() {
  return <ParityTaxonomyListing level="subcategory"><TaxonomyListing level="subcategory" /></ParityTaxonomyListing>;
}