/** @param {NS} ns */
export async function main(ns) {
	// How much we should divide our money by when testing if we can buy something (5 would mean we divide our money by 5, essentially maxing purchase price to 20% of our full money)
	const moneydivider = 5
	let servercount = findpservers(ns).length || 0
	// Fill up the servers. won't continue until all slots are filled.
	while (servercount < ns.getPurchasedServerLimit()) {
		PurchaseMostExpensiveServer(ns, moneydivider, servercount)
		servercount = findpservers(ns).length || 0
		await ns.sleep(3000)
	}
	ns.tprint("All server slots filled, beginning upgrade monitoring...")
	// After all slots are filled, begin the upgrade loop
	while (true) {
		let smallestpserver = FindSmallestGBserver(ns, findpservers(ns))
		let upgraded = UpgradeServerToMax(ns, smallestpserver, moneydivider)
		//Make the script wait for a second before looping again.
		//Removing this line will cause an infinite loop and crash the game.
		await ns.sleep(500)
	}
}

// returns a list of all pserver hostnames, smaller than ns.getpurchasedservers
export function findpservers(ns) {
	const regex = new RegExp('^pserver*')
	// get all servers connected to home
	let servers = ns.scan('home')
	let pserverlist = []
	// filter for servers which match the regex
	for (let server of servers) {
		if (regex.test(server)) {
			pserverlist.push(server)
		}
	}
	// return pservers
	return pserverlist
}

// returns the server hostname with the smallest amount of ram from a list of hostnames
export function FindSmallestGBserver(ns, servers) {
	let smallest = servers[0]
	for (let server of servers) {
		if (ns.getServerMaxRam(server) < ns.getServerMaxRam(smallest)) {
			smallest = server
		}
	}
	return smallest
}

// Purchase the most expensive server we can afford with money/moneydivider money. Returns the hostname of the server
export function PurchaseMostExpensiveServer(ns, moneydivider, counter) {
	// loop thorugh all possible ram sizes, starting from most expensive
	for (let i = ns.getPurchasedServerMaxRam(); 2 <= i; i = i / 2) {
		if ((ns.getServerMoneyAvailable("home") / moneydivider) > ns.getPurchasedServerCost(i)) {
			// If we have enough money, then:
			//  1. Purchase the server
			// 	2. Break the loop (return)
			let hostname = ns.purchaseServer(`pserver-${counter+1}`, i);
			ns.tprint(`Bought ${hostname} for ${ns.getPurchasedServerCost(i)}`)
			return hostname
		}
	}
}

// Upgrade the given server to the highest level we can afford and is higher than the current level
// Returns true if we could upgrade, false if we could not.
export function UpgradeServerToMax(ns, server, moneydivider) {
	// loop thorugh all possible ram sizes, starting from most expensive
	for (let i = ns.getPurchasedServerMaxRam(); 2 <= i; i = i / 2) {
		if (ns.getServerMaxRam(server) < i) {
			if ((ns.getServerMoneyAvailable("home") / moneydivider) > ns.getPurchasedServerUpgradeCost(server, i)) {
				// If we have enough money, then:
				//  1. Purchase the server
				// 	2. Break the loop (return)
				let hostname = ns.upgradePurchasedServer(server, i)
				ns.tprint(`Upgraded ${server} for ${ns.getPurchasedServerCost(i)}`)
				return true
			}
		}
	}
	return false
}