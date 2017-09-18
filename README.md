# Checkpoint IP

This is a microservice for checking if an IP address is in the [Firehol Blocklist](https://github.com/firehol/blocklist-ipsets).

With this service, you can pass in an IP address and it will return if that IP address should be allowed based on the list of blocked addresses in the Firehol Blocklist. If an IP address is allowed, then the server returns an object indicating the IP should be allowed. If the IP address is blocked by some list, a flag is returned indicating as such, as well as providing information about why that IP was blocked.

## Usage

The service is used by connecting to the service over a socket (defaults to `8000`) and writing IP Addresses followed by a newline to the socket. IPs should be in the IPv4 format and should always be followed by a `\n` newline character.

The system will respond on the same socket with a JSON encoded object followed by a newline character. The object will contain the following information:

```javascript
{
	ip:         '', // The value passed in that this response is concerning
	allowed: false, // Boolean indicating if this IP is "allowed" (not on a block list)
	list:       '', // Name of the blocklist this appears on. Otherwise false
	
	// If the IP is not valid, we will return an object that contains an "error" but
	// not a "list" key. This error will be an error message for the error.
}
```

### Example

```javascript
// Client code
connection.write('127.0.0.1');

// Handle the incoming data
connection.setEncoding('utf8');

let currChunk = '';
connection.on('data', (chunk) => {
	currChunk += chunk;
	
	// If we've got a newline, it means we have a full JSON response
	while(currChunk.indexOf('\n') >= 0) {
		const idx = currChunk.indexOf('\n');
		const jsonString = currChunk.substring(0, idx);
		
		const response = JSON.parse(jsonString);
		
		// ... Do something with response ...
		
		currChunk = currChunk.slice(idx + 1);
	}
});
```

## Testing

Tests can be run by simply running `npm test`.

Additionally, benchmarking tests may be run against the system by running `npm run benchmark`.
