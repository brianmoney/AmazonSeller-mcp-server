# Amazon Selling Partner API MCP Server

    A Model Context Protocol (MCP) server for interacting with the Amazon Selling Partner API. This server provides tools and resources for accessing Amazon SP-API functionality through a standardized interface.

    ## Features

    - Authentication and authorization with Amazon SP-API
    - Comprehensive coverage of SP-API endpoints
    - Documentation resources for API reference
    - Tools for managing catalog, inventory, orders, reports, and more
    - Secure credential handling

    ## Prerequisites

    - Node.js 16 or higher
    - Amazon Selling Partner API application credentials

    ## Installation

    ```bash
    npm install amazon-sp-api-mcp-server
    ```

    Or run directly with npx:

    ```bash
    npx amazon-sp-api-mcp-server
    ```

    ## Configuration

    Create a `.env` file in the root directory with your Amazon SP-API credentials:

    ```
    SP_API_CLIENT_ID=your_client_id
    SP_API_CLIENT_SECRET=your_client_secret
    SP_API_REFRESH_TOKEN=your_refresh_token
    SP_API_MARKETPLACE_ID=ATVPDKIKX0DER
    SP_API_REGION=us-east-1
    ```

    Only the LWA/SP-API values above are required. The server no longer expects AWS access key, secret key, or role ARN values.

    `SP_API_REGION` is used to select the correct SP-API endpoint partition:

    - `us-east-1` -> `sellingpartnerapi-na.amazon.com`
    - `eu-west-1` -> `sellingpartnerapi-eu.amazon.com`
    - `us-west-2` -> `sellingpartnerapi-fe.amazon.com`

    ## Usage

    Start the server:

    ```bash
    npm start
    ```

    For local stdio use in VS Code or OpenCode, launch the server directly with:

    ```bash
    node src/index.js
    ```

    This command is stdio-safe and does not print a startup banner to stdout before the MCP handshake.

    For development with auto-restart:

    ```bash
    npm run dev
    ```

    To test with MCP Inspector:

    ```bash
    npm run inspect
    ```

    ## Available Tools

    The server provides tools for interacting with various aspects of the Amazon Selling Partner API:

    - Authentication tools
    - Catalog tools
    - Inventory management
    - Order processing
    - Report generation and retrieval
    - Feed submission
    - Financial data access
    - Notification management
    - Product pricing
    - Listings management
    - FBA operations

    ## Documentation Resources

    Access API documentation through the `amazon-sp-api://{category}` resource, where category can be:

    - overview
    - authentication
    - catalog
    - orders
    - inventory
    - reports
    - feeds
    - finance
    - notifications
    - productPricing
    - listings
    - fba

    ## License

    MIT
