/** @param {NS} ns */
export async function main(ns) {

	const currentserver = ns.getHostname();
	const servers = deepscan(ns, currentserver);
	let script
	let counter = 0
	let servercounter = 0

	script = ns.args[0];
	if (script === undefined) {
		ns.tprint("You need to define a script as an argument")
		ns.exit()
	}

	let hackinglevel = ns.getHackingLevel();
	// server is the hostname of the server
	for (let server of servers) {
		// If we can hack the server, do so
		if ((hackinglevel >= ns.getServerRequiredHackingLevel(server)) && (ns.getServerNumPortsRequired(server) <= 5)) {
			// hack the server
			if (ns.fileExists('BruteSSH.exe')) {
				ns.brutessh(server) //BruteSSH.exe
			}
			if (ns.fileExists('FTPCrack.exe')) {
				ns.ftpcrack(server) //FTPCrack.exe
			}
			if (ns.fileExists('relaySMTP.exe')) {
				ns.relaysmtp(server) //relaySMTP.exe
			}
			if (ns.fileExists('HTTPWorm.exe')) {
				ns.httpworm(server) //HTTPWorm.exe
			}
			if (ns.fileExists('SQLInject.exe')) {
				ns.sqlinject(server) //SQLInject.exe
			}
			// Hit it.
			ns.nuke(server)
		}
		if (((ns.getServer(server).hasAdminRights) && (server !== "home"))) {
			counter += runscript(ns, server, script)
			servercounter += 1
		}
	}
	ns.tprint(`Script successful, running '${script}' on ${counter} threads across ${servercounter} servers`)
}

export function deepscan(ns, server) {
	// Servers is a set that will contain all the deepscanned servers uniquely by the end
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
	return Array.from(servers)
}


export function runscript(ns, server, script) {
	ns.killall(server)
	let availram = (ns.getServerMaxRam(server) - ns.getServerUsedRam(server))
	console.log(availram)
	let availthreads = Math.floor(availram / ns.getScriptRam(script))

	// copy the scirpt to the server we are going to hack
	ns.scp(script, server, "home")

	// run the script that was copied as many times as we can
	if (availthreads > 0) {
		ns.tprint(`autonuke: Running ${script} on ${server} (${ns.getServerMaxRam(server)}GB) on ${availthreads} threads!`)
		ns.exec(script, server, availthreads)
	}
	// return the number of threads we run on this server
	return availthreads
}