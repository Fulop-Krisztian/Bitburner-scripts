/** @param {NS} ns */
// Script for renaming servers. Buggy, but if you run it enough times 
// it should eventually rename servers so that they are standardized 
export async function main(ns) {
	let servers = ns.scan()
	const regex = new RegExp('^pserver*')
	let index = 1


	for (let server of servers) {
		if (regex.test(server)) {
			if (ns.serverExists(`pserver-${index}`)) {
				ns.renamePurchasedServer(`pserver-${index}`, "tempserver")
			}

			ns.renamePurchasedServer(server,`pserver-${index}`)
			ns.tprint(`renamned ${server} to pserver-${index}` )
			index += 1

			if (ns.serverExists("tempserver")){
				ns.renamePurchasedServer("tempserver",`pserver-${index}`)
				index += 1

			}
		} 
	}
}