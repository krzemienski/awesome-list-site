import TaxonomyListing from "./TaxonomyListing";
import { ParityTaxonomyListing } from "@/components/parity/ParityTaxonomyListing";

export default function SubSubcategory() {
  return <ParityTaxonomyListing level="sub-subcategory"><TaxonomyListing level="sub-subcategory" /></ParityTaxonomyListing>;
}