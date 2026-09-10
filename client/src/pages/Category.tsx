import TaxonomyListing from "./TaxonomyListing";
import { ParityTaxonomyListing } from "@/components/parity/ParityTaxonomyListing";

export default function Category() {
  return <ParityTaxonomyListing level="category"><TaxonomyListing level="category" /></ParityTaxonomyListing>;
}