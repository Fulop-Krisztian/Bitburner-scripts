/** @param {NS} ns */
// A function to scan for good hacking target servers
export async function main(ns) {
	// credit to https://www.patorjk.com/software/taag
	ns.tprint(`
██████╗ ███████╗███████╗██████╗ ███████╗ ██████╗ █████╗ ███╗   ██╗
██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗████╗  ██║
██║  ██║█████╗  █████╗  ██████╔╝███████╗██║     ███████║██╔██╗ ██║
██║  ██║██╔══╝  ██╔══╝  ██╔═══╝ ╚════██║██║     ██╔══██║██║╚██╗██║
██████╔╝███████╗███████╗██║     ███████║╚██████╗██║  ██║██║ ╚████║
╚═════╝ ╚══════╝╚══════╝╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝                                   
`)
	// Servers is a set that will contain all the deepscanned servers uniquely by the end

	let server = ns.args[0];
	const servers = new Set(ns.scan(server));
	// We save the index of the 
	let NewServersStartIndex = 0;
	let OldServersStartIndex = 0;
	// we are doing "recursive" scans.

	/**	@ignore-infinite */
	while (true) {
		// We get the index where we should start looking for new servers
		NewServersStartIndex = servers.size
		// If we didn't find any new servers we break
		if (NewServersStartIndex === OldServersStartIndex) { break }

		// We look for new servers, and append them to the set if we find them. Only unique ones, since this is a set.
		for (var i = OldServersStartIndex; i < servers.size; i++) {
			server = Array.from(servers)[i];
			let scanresult = ns.scan(server);
			for (let scannedserver of scanresult) {
				servers.add(scannedserver)
			}
		}
		// We age the new server size
		OldServersStartIndex = NewServersStartIndex
	}

	let maxmoney = 'n00dles'
	// now we are going to print the server with the most money:
	for (let entry of Array.from(servers)) {
		if (ns.getServer(entry).hasAdminRights) {
			if (ns.getServerMaxMoney(entry) > ns.getServerMaxMoney(maxmoney)) {
				maxmoney = entry
			}
		}
	}
	printserver(ns, maxmoney, "Highest max money cracked server")
	maxmoney = 'n00dles'

	for (let entry of Array.from(servers)) {
		if ((ns.getServer(entry).hasAdminRights) && ((ns.getServerRequiredHackingLevel(entry) * 2) <= ns.getHackingLevel())) {
			if (ns.getServerMaxMoney(entry) > ns.getServerMaxMoney(maxmoney)) {
				maxmoney = entry
			}
		}
	}
	ns.getServerMoneyAvailable
	printserver(ns, maxmoney, "Optimal server for hacking currently")
}

export function printserver(ns, server, msg = undefined) {
	ns.tprint(`vvvvvvvvvvvvvvvvvvvvvvvvv HOST: ${server} vvvvvvvvvvvvvvvvvvvvvvvvv`)
	if (msg) {
		ns.tprint(`	COMMENT: ${msg}`)
	}
	ns.tprint(`	STATS:`)
	ns.tprint(`		Current/Max money: ${ns.getServerMoneyAvailable(server) / 1000000}M/${ns.getServerMaxMoney(server) / 1000000}M`)
	ns.tprint(`		Req hacking level/ports: ${ns.getServerRequiredHackingLevel(server)}/${ns.getServerNumPortsRequired(server)}`)
	ns.tprint(`		Min/Current/Base security level: ${ns.getServerMinSecurityLevel(server)}/${ns.getServerSecurityLevel(server)}/${ns.getServerBaseSecurityLevel(server)}`)
	//ns.tprint(`		Current security level: ${ns.getServerSecurityLevel(server)}`)
	ns.tprint(`		Server Growth: ${ns.getServerGrowth(server)}`)
	ns.tprint(`		Grow time: ${ns.getGrowTime(server) / 1000}s`)
	ns.tprint(`		Hack time: ${ns.getHackTime(server) / 1000}s`)
	ns.tprint(`		Weaken time: ${ns.getWeakenTime(server) / 1000}s`)
	ns.tprint(``)

}