import { z } from 'zod';
    import { makeSpApiRequest } from '../utils/auth.js';

    export const listingsTools = {
      getListingsItem: {
        schema: {
          sellerId: z.string().describe("The seller identifier"),
          sku: z.string().describe("The seller SKU of the listings item"),
          marketplaceIds: z.array(z.string()).optional().describe("A list of marketplace identifiers"),
          issueLocale: z.string().optional().describe("A locale for localization of issues"),
          includedData: z.array(z.enum(['summaries', 'attributes', 'issues', 'offers', 'fulfillmentAvailability', 'procurement'])).optional().describe("Data sections to include. Defaults to summaries, attributes, issues.")
        },
        handler: async ({ sellerId, sku, marketplaceIds, issueLocale, includedData }) => {
          try {
            const queryParams = {
              marketplaceIds: marketplaceIds || [process.env.SP_API_MARKETPLACE_ID],
              includedData: includedData || ['summaries', 'attributes', 'issues']
            };
            
            if (issueLocale) {
              queryParams.issueLocale = issueLocale;
            }
            
            const data = await makeSpApiRequest(
              'GET',
              `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}`,
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting listings item: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Returns details about a listings item for a selling partner"
      },
      
      putListingsItem: {
        schema: {
          sellerId: z.string().describe("The seller identifier"),
          sku: z.string().describe("The seller SKU of the listings item"),
          marketplaceIds: z.array(z.string()).optional().describe("A list of marketplace identifiers"),
          issueLocale: z.string().optional().describe("A locale for localization of issues"),
          productType: z.string().describe("The Amazon product type of the listings item"),
          requirements: z.string().optional().describe("The name of the requirements set for the provided data"),
          attributesJson: z.string().optional().describe("Listing attributes as a JSON string (preferred). E.g. '{\"item_name\":[{\"value\":\"My Title\",\"language_tag\":\"en_US\"}],\"bullet_point\":[{\"value\":\"Feature 1\",\"language_tag\":\"en_US\"}]}'. Use this instead of attributes when calling from chat."),
          attributes: z.record(z.any()).optional().describe("Listing attributes as a structured object (for programmatic callers). Ignored when attributesJson is also provided.")
        },
        handler: async ({ sellerId, sku, marketplaceIds, issueLocale, productType, requirements, attributesJson, attributes }) => {
          try {
            // Resolve attributes: attributesJson (string from chat) takes priority over attributes object
            let resolvedAttributes = attributes;
            if (attributesJson !== undefined) {
              try {
                resolvedAttributes = JSON.parse(attributesJson);
              } catch (parseError) {
                return {
                  content: [{ type: "text", text: `Error parsing attributesJson: ${parseError.message}` }],
                  isError: true
                };
              }
            }
            if (resolvedAttributes === undefined) {
              return {
                content: [{ type: "text", text: "Error: either attributesJson or attributes must be provided" }],
                isError: true
              };
            }

            const queryParams = {
              marketplaceIds: marketplaceIds || [process.env.SP_API_MARKETPLACE_ID]
            };
            
            if (issueLocale) {
              queryParams.issueLocale = issueLocale;
            }
            
            if (requirements) {
              queryParams.requirements = requirements;
            }
            
            const payload = {
              productType,
              attributes: resolvedAttributes
            };
            
            const data = await makeSpApiRequest(
              'PUT',
              `/listings/2021-08-01/items/${sellerId}/${sku}`,
              payload,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error updating listings item: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Creates or updates a listings item for a selling partner"
      },
      
      deleteListingsItem: {
        schema: {
          sellerId: z.string().describe("The seller identifier"),
          sku: z.string().describe("The seller SKU of the listings item"),
          marketplaceIds: z.array(z.string()).optional().describe("A list of marketplace identifiers"),
          issueLocale: z.string().optional().describe("A locale for localization of issues"),
          includedData: z.array(z.enum(['summaries', 'attributes', 'issues', 'offers', 'fulfillmentAvailability', 'procurement'])).optional().describe("Data sections to include. Defaults to summaries, attributes, issues.")
        },
        handler: async ({ sellerId, sku, marketplaceIds, issueLocale, includedData }) => {
          try {
            const queryParams = {
              marketplaceIds: marketplaceIds || [process.env.SP_API_MARKETPLACE_ID]
            };
            
            if (issueLocale) {
              queryParams.issueLocale = issueLocale;
            }
            
            const data = await makeSpApiRequest(
              'DELETE',
              `/listings/2021-08-01/items/${sellerId}/${sku}`,
              null,
              queryParams
            );
            
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error deleting listings item: ${error.message}` }],
              isError: true
            };
          }
        },
        description: "Deletes a listings item for a selling partner"
      }
    };
