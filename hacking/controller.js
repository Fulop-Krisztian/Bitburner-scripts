/** @param {NS} ns */
export async function main(ns) {
	// ----------------- CONSTANT DECLARATION SECTION ----------------- //
	//#region
	// This should't normally be changed
	const hackram = 1.70; // RAM used by hack
	const growram = 1.75; // RAM used by grow
	const weakram = 1.75; // RAM used by weaken

	// Ratio of operations to each other to run while the whole thing is up.
	//#endregion
	let serverToAttack = "n00dles"

	while (true) {
		// RATIOS (1:8:2 is maybe good for a start according to documentation)
		let hackratio = 1;
		let growratio = 11;
		let weakratio = 7;

		let log = false
		let outerupdate = false
		let servercounter = 0
		let numWeakenSum = 0
		let numGrowSum = 0
		let numHackSum = 0
		let totalUsedRamSum = 0
		let availramSum = 0
		// ----------------- DISCOVERY SECTION ----------------- //
		// Prepare servers for hacking, and get a list of hackable servers.
		//#region
		let hackableServers = discover(ns, ['weaken.js', 'grow.js', 'hack.js'])
		//#endregion

		// We will calculate a server to attack (max money and under half hacking level)
		for (let entry of deepscan(ns, ns.getHostname())) {
			if ((ns.getServer(entry).hasAdminRights) && ((ns.getServerRequiredHackingLevel(entry) * 2) <= ns.getHackingLevel())) {
				if (ns.getServerMaxMoney(entry) > ns.getServerMaxMoney(serverToAttack)) {
					serverToAttack = entry
					outerupdate = true
				}
			}
		}

		// Ratio control for edge cases to make the scipts more profitable:
		if (ns.getServerMoneyAvailable(serverToAttack) < (ns.getServerMaxMoney(serverToAttack) * 0.70)) {
			hackratio = 0
		}

		// Prevent runaway security level.
		const minsec = ns.getServerMinSecurityLevel(serverToAttack)
		const basesec = ns.getServerBaseSecurityLevel(serverToAttack)
		if (ns.getServerSecurityLevel(serverToAttack) > basesec) {
			//weakratio = weakratio * weakscaler(minsec, basesec, ns.getServerSecurityLevel(serverToAttack))
			weakratio = 1
			hackratio = 0
			growratio = 0
		}

		if (outerupdate) {
			printserver(ns, serverToAttack, "New optimal server identified")
			ns.tprint(`New target!: We are attacking: ${serverToAttack}`)
		}



		// ----------------- ITERATION SECTION ----------------- //
		// This section is run for all hackable servers seperately
		// TODO: manage ratios live based on the attackedServer state

		//#region
		for (let hackableserver of hackableServers) {
			// If the server has no ram, just skip this whole thing.
			if (ns.getServerMaxRam(hackableserver) === 0) { continue }
			let update = outerupdate
			// In this scope, hackableServer refers to the currnet server
			// ----------------- ITERATION >>> CALCULATION SECTION ----------------- //
			const availram = ns.getServerMaxRam(hackableserver); // Available RAM

			const { numHack, numGrow, numWeaken, totalUsedRam, remainingRam } =
				calculateOptimalInstances(
					availram,
					hackram,
					growram,
					weakram,
					hackratio,
					growratio,
					weakratio,
				);

			await ns.sleep(50)
			// ----------------- ITERATION >>> DEPLOYMENT SECTION ----------------- //
			let weakScriptState = ns.getRunningScript('weaken.js', hackableserver, serverToAttack);
			let growScriptState = ns.getRunningScript('grow.js', hackableserver, serverToAttack);
			let hackScriptState = ns.getRunningScript('hack.js', hackableserver, serverToAttack);

			// Determine if we need to update based on the current and desired thread counts
			const weakThreadsRunning = weakScriptState ? weakScriptState.threads : 0;
			const growThreadsRunning = growScriptState ? growScriptState.threads : 0;
			const hackThreadsRunning = hackScriptState ? hackScriptState.threads : 0;

			update = (weakThreadsRunning !== numWeaken) ||
				(growThreadsRunning !== numGrow) ||
				(hackThreadsRunning !== numHack);

			// if none of the scipts are running, we set update the server
			if (!weakScriptState && !growScriptState && !hackScriptState) {
				update = true
			}
			if (update) {
				// First we kill all the scripts we manage to make way scripts
				ns.killall(hackableserver, true)

				// Based on the calculated numbers, we deploy the scripts on the server
				runscript(ns, hackableserver, serverToAttack, 'weaken.js', numWeaken)
				runscript(ns, hackableserver, serverToAttack, 'grow.js', numGrow)
				runscript(ns, hackableserver, serverToAttack, 'hack.js', numHack)
				ns.print(`${ns.getTimeSinceLastAug()}(Re)deploying scripts on ${hackableserver} servers: ${numWeaken} weaken, ${numGrow} grow, ${numHack} hack threads (${totalUsedRam}GB/${availram}GB)`)
				log = true
			}
			servercounter += 1
			numWeakenSum += numWeaken
			numGrowSum += numGrow
			numHackSum += numHack
			totalUsedRamSum += totalUsedRam
			availramSum += availram
			//#endregion
		}
		if (outerupdate || log) {
			ns.tprint(`(Re)deploying scripts on ${servercounter} servers: ${numWeakenSum} weaken, ${numGrowSum} grow, ${numHackSum} hack threads (${totalUsedRamSum}GB/${availramSum}GB)`)
		}
		await ns.sleep(5000)
	}
}




/**
 * This function hacks hackable servers and returns a list of hostnames (except home) which are currently available for using scripts.
 * @param {NS} ns The ns parameter needs to be passed to this function from main.
 * @param {string[] | string} scripts Optional. Copies the given scripts to servers we can hack.
 * @returns {string[]} A list containing all hackable servers.
 */
export function discover(ns, scripts = undefined) {
	const hackinglevel = ns.getHackingLevel()
	let hackable = []
	let servers = deepscan(ns, ns.getHostname())
	let servercounter = 0

	for (let server of servers) {
		// If we can hack the server, do so

		if (!(ns.hasRootAccess(server))) {
			let portopenlevel = 0
			if (ns.fileExists("BruteSSH.exe", "home")) {
				portopenlevel += 1 //BruteSSH.exe
			}
			if (ns.fileExists("FTPCrack.exe", "home")) {
				portopenlevel += 1 //FTPCrack.exe
			}
			if (ns.fileExists("relaySMTP.exe", "home")) {
				portopenlevel += 1 //relaySMTP.exe
			}
			if (ns.fileExists("HTTPWorm.exe", "home")) {
				portopenlevel += 1 //HTTPWorm.exe
			}
			if (ns.fileExists("SQLInject.exe", "home")) {
				portopenlevel += 1 //SQLInject.exe
			}
			if ((hackinglevel >= ns.getServerRequiredHackingLevel(server)) && (ns.getServerNumPortsRequired(server) <= portopenlevel)) {
				// hack the server
				if (ns.fileExists("BruteSSH.exe", "home")) {
					ns.brutessh(server) //BruteSSH.exe
				}
				if (ns.fileExists("FTPCrack.exe", "home")) {
					ns.ftpcrack(server) //FTPCrack.exe
				}
				if (ns.fileExists("relaySMTP.exe", "home")) {
					ns.relaysmtp(server) //relaySMTP.exe
				}
				if (ns.fileExists("HTTPWorm.exe", "home")) {
					ns.httpworm(server) //HTTPWorm.exe
				}
				if (ns.fileExists("SQLInject.exe", "home")) {
					ns.sqlinject(server) //SQLInject.exe
				}
				// Hit it.
				ns.nuke(server)
				ns.tprint(`Cracked new server: ${server}!`)
			}
			// Copy scripts to the servers we can hack
			if (scripts) {
				ns.scp(scripts, server, 'home')
			}
		}

		// add server to hackable list to be returned at the end
		if (((ns.getServer(server).hasAdminRights) && (server !== "home"))) {
			servercounter += 1
			hackable.push(server)
		}
	}
	return hackable
}

/**
 * Calculates the optimal number of instances for each operation to fit within the available RAM.
 * @param {number} availram  Available RAM in GB.
 * @param {number} hackram  RAM used by hack operation.
 * @param {number} growram  RAM used by grow operation.
 * @param {number} weakram  RAM used by weaken operation.
 * @param {number} hackratio  Ratio of hack operations.
 * @param {number} growratio  Ratio of grow operations.
 * @param {number} weakratio  Ratio of weaken operations.
 * @returns {Object} An object containing the number of instances of each operation and the total RAM used and remaining.
 */
export function calculateOptimalInstances(availram, hackram, growram, weakram, hackratio, growratio, weakratio) {
	// Adjust total unit size based on non-zero ratios
	const totalUnitSize = (hackratio > 0 ? hackratio * hackram : 0) +
		(growratio > 0 ? growratio * growram : 0) +
		(weakratio > 0 ? weakratio * weakram : 0);

	// Calculate how many full units can fit into the total RAM
	const k = totalUnitSize > 0 ? Math.floor(availram / totalUnitSize) : 0;

	// Calculate the number of instances of hack, grow, weaken based on the base allocation
	let numHack = (hackratio > 0) ? Math.floor(k * hackratio) : 0;
	let numGrow = (growratio > 0) ? Math.floor(k * growratio) : 0;
	let numWeaken = (weakratio > 0) ? Math.floor(k * weakratio) : 0;

	// Calculate the total RAM used by the calculated instances
	let totalUsedRam = (numHack * hackram) + (numGrow * growram) + (numWeaken * weakram);

	// Remaining RAM after initial allocation
	let remainingRam = availram - totalUsedRam;

	// Function to calculate how far each operation is behind its ratio
	const calcRatioProgress = (hack, grow, weaken) => {
		const hackProgress = hackratio > 0 ? hack / hackratio : Infinity;
		const growProgress = growratio > 0 ? grow / growratio : Infinity;
		const weakenProgress = weakratio > 0 ? weaken / weakratio : Infinity;
		return { hackProgress, growProgress, weakenProgress };
	};

	// Allocate remaining RAM based on which operation is furthest behind its ratio
	while (remainingRam >= Math.min(hackram, growram, weakram)) {
		const { hackProgress, growProgress, weakenProgress } = calcRatioProgress(numHack, numGrow, numWeaken);

		// Find which operation is furthest behind its target ratio
		if (hackratio > 0 && hackProgress <= growProgress && hackProgress <= weakenProgress && remainingRam >= hackram) {
			numHack++;
			remainingRam -= hackram;
		} else if (growratio > 0 && growProgress <= hackProgress && growProgress <= weakenProgress && remainingRam >= growram) {
			numGrow++;
			remainingRam -= growram;
		} else if (weakratio > 0 && weakenProgress <= hackProgress && weakenProgress <= growProgress && remainingRam >= weakram) {
			numWeaken++;
			remainingRam -= weakram;
		} else {
			break; // If we can't fit any more operations, stop
		}
	}

	// Recalculate the total RAM used by the calculated instances
	totalUsedRam = (numHack * hackram) + (numGrow * growram) + (numWeaken * weakram);

	// Return the results
	return {
		numHack,
		numGrow,
		numWeaken,
		totalUsedRam,
		remainingRam
	};
}


/**
 * Deepscan will give back a complete list of all discoverable servers on the network.
 * @param {NS} ns The ns parameter needs to be passed to this function from main.
 * @param {string} server The hostname to start the scan from
 * @returns {string[]} A string of all discoverable hosts' hostnames
 */
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
		// We look for new servers, and append them to the set if we find them. (Only unique ones, since this is a set.)
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
/**
 * This function hacks hackable servers and returns a list of hostnames (except home) which are currently available for using scripts.
 * @param {NS} ns The ns parameter needs to be passed to this function from main.
 * @param {string} server The server to deploy the scripts on.
 * @param {string} serverToAttack The server the scripts will target.
 * @param {string} script The script that we should deploy
 * @param {string} threads How many threads we should deploy of the script.
 * @returns {boolean} Returns the PID of the started process.
 */
export function runscript(ns, server, serverToAttack, script, threads) {
	// run the script that was copied as many times as we can
	if (threads > 0) {
		return ns.exec(script, server, threads, serverToAttack)
	}
}


export function printserver(ns, server, msg = undefined) {
	ns.tprint(`vvvvvvvvvvvvvvvvvvvvvvvvv HOST: ${server} vvvvvvvvvvvvvvvvvvvvvvvvv`)
	if (msg) {
		ns.tprint(`	COMMENT: ${msg}`)
	}
	ns.tprint(`	STATS:`)
	ns.tprint(`		Current/Max money: ${ns.getServerMoneyAvailable(server) / 1000000}M/${ns.getServerMaxMoney(server) / 1000000}M`)
	ns.tprint(`		Req hacking level/ports: ${ns.getServerRequiredHackingLevel(server)}/${ns.getServerNumPortsRequired(server)}`)
	ns.tprint(`		Current/Base security level: ${ns.getServerSecurityLevel(server)}/${ns.getServerBaseSecurityLevel(server)}`)
	//ns.tprint(`		Current security level: ${ns.getServerSecurityLevel(server)}`)
	ns.tprint(`		Server Growth: ${ns.getServerGrowth(server)}`)
	ns.tprint(`		Grow time: ${ns.getGrowTime(server) / 1000}s`)
	ns.tprint(`		Hack time: ${ns.getHackTime(server) / 1000}s`)
	ns.tprint(`		Weaken time: ${ns.getWeakenTime(server) / 1000}s`)
	ns.tprint(``)

}

/**
 * Calculates the value of Y for a given X using an exponential function that passes
 * through the points (X1, 1) and (X2, 2).
 *
 * The function is constructed such that:
 *  - When X = X1, the function returns Y = 1.
 *  - When X = X2, the function returns Y = 2.
 *
 * The growth rate k is calculated based on the provided points using the formula:
 *  - k = ln(2) / (X2 - X1)
 *
 * @param {number} X1 - The x-coordinate where Y equals 1 (the first anchor point).
 * @param {number} X2 - The x-coordinate where Y equals 2 (the second anchor point).
 * @param {number} X  - The x-value for which to calculate the corresponding y-value.
 * @returns {number}  - The calculated y-value for the given X.
 *
 * Example usage:
 * const yValue = weakscaler(1, 4, 2.5);
 * console.log(yValue); // Outputs the calculated Y for X = 2.5
 */
export function weakscaler(X1, X2, X) {
	// Calculate the growth rate (k)
	const k = Math.log(2) / (X2 - X1);

	// Calculate and return Y = e^(k * (X - X1))
	return Math.exp(k * (X - X1));
}