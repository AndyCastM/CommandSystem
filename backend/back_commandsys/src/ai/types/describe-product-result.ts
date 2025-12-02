export interface DescribeProductResult {
  professional: string;
  commercial: string;
  short: string;
  allergens: string[];
  nameSuggestions: string[];
  social: {
    instagram: string;
    facebook: string;
  };
}
