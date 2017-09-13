# Checkpoint IP

This is a microservice for checking if an IP address is in the [Firehol Blocklist](https://github.com/firehol/blocklist-ipsets).

With this service, you can pass in an IP address and it will return if that IP address should be allowed based on the list of blocked addresses in the Firehol Blocklist. If an IP address is allowed, then the server returns an object indicating the IP should be allowed. If the IP address is blocked by some list, a flag is returned indicating as such, as well as providing information about why that IP was blocked.

## Development Process

The process and decisions for this development are being documented in [the Wiki](https://github.com/ktsashes/checkpoint-ip/wiki).
