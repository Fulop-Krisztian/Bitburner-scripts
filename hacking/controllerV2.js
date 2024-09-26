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
	let serverToAttack = ns.getServer('n00dles')
	const player = ns.getPlayer()


	const moneyDrained = 0.15 // The percentage of a servers money that we should drain

	// Time offset between finishing scripts
	const timeOffset = 300;

	// The scripts that we should run in order of finishing
	let scriptsToRun = []
	let hackableServers = discover(ns, ['weakenonce.js', 'growonce.js', 'hackonce.js'])

	// These need to be redefined for each server
	scriptsToRun.push(new JobDefinition('hackonce.js', ns.formulas.hacking.hackTime(serverToAttack, player), 0, hackram))
	scriptsToRun.push(new JobDefinition('weakenonce.js', ns.formulas.hacking.weakenTime(serverToAttack, player), 1, weakram))
	scriptsToRun.push(new JobDefinition('growonce.js', ns.formulas.hacking.growTime(serverToAttack, player), 2, growram))
	scriptsToRun.push(new JobDefinition('weakenonce.js', ns.formulas.hacking.weakenTime(serverToAttack, player), 3, weakram))

	let { JobList, executionWindow, fullExecTime } = calculateBatchTiming(ns, scriptsToRun, timeOffset)
	// The number of batches that will run concurrently. This is a prediction and could change depending on the state of the server (which should not change in ideal conditions).
	let concurrentBatches = Math.ceil(fullExecTime / executionWindow)
	ns.tprint(`Execution window: ${executionWindow}`)
	ns.tprint(`Full batch execution time: ${fullExecTime}`)
	ns.tprint(`Max concurrent batches running at one time: ${concurrentBatches}`)
	for (let x = 0; x < 15; x++) {
		await runBatch(ns, JobList, 'pserver-1')
	}
}







class JobDefinition {
	constructor(script, time, order, ram) {
		this.script = script;
		this.executionTime = time;
		// This is the finishing order (0 finishes first, and the others finish order*offset after.)
		this.order = order;
		this.ram = ram;
	}
}

class Job {
	constructor(script, exectime, time, ram, threads = 1, target = 'n00dles') {
		this.script = script;
		this.executionTime = exectime;
		this.executionTimeFromPrev = time;
		this.ram = ram;
		this.threads = threads;
		this.target = target
	}
}

/**
 * This function hacks hackable servers and returns a list of hostnames (except home) which are currently available for using scripts.
 * @param {NS} ns The ns parameter needs to be passed to this function from main.
 * @param {Job[]} Jobs The that make up the batch to run.
 * @param {string} serverToRunOn The server we want to run the scripts on (not the same as the server we want to attack)
 * @returns {boolean} Returns the PID of the started process.
 */
async function runBatch(ns, Jobs, serverToRunOn) {
	// run the script that was copied as many times as we can
	for (let batchJob of Jobs) {
		await ns.sleep(batchJob.executionTimeFromPrev)
		ns.exec(batchJob.script, serverToRunOn, batchJob.threads, batchJob.target)
	}
}

/**
 * Calculates the execution order and timing for a batch of jobs based on given JobDefinitions.
 *
 * This function processes a list of JobDefinitions and determines the order in which jobs should be executed,
 * along with the total execution time required for the batch.
 *
 * @param {NS} ns - The NS object passed from the main function.
 * @param {JobDefinition[]} JobDefinitions - An array of JobDefinition objects describing the scripts to run.
 * @param {number} timeOffset - The time offset between the endings of the scripts.
 *
 * @returns {{ JobList: Job[], executionWindow: number }} An object containing:
 *  - JobList: An array of jobs to execute (with threads set to null).
 *  - executionWindow: The window of time within which the Jobs end. It indicates how much time should pass between executions of this funciton.
 * 	- fullExecTime: The full execution time of the whole batch.
 */
function calculateBatchTiming(ns, JobDefinitions, timeOffset) {
	// Distance to finishing weak of the batch (used when calculating the full lenght, because $distanceOfTheLongestFunction * $Delay + $maxTime  is)

	// The two vars below will be the same most of the time (according to the game's logic).
	// This is the last job in the list to finish.
	const lastJob = JobDefinitions[(JobDefinitions.length - 1)]

	// Sort jobs based on the custom formula: executionTime + (lastJob.order - jobdef.order) * timeOffset
	// This formula gives the execution order from the start when sorting the results from highest to lowest.
	JobDefinitions.sort((a, b) => {
		// Calculate the sorting value for job 'a' and 'b'
		let valueA = a.executionTime + (lastJob.order - a.order) * timeOffset;
		let valueB = b.executionTime + (lastJob.order - b.order) * timeOffset;

		// Sort in descending order (higher sorting value comes first)
		return valueB - valueA;
	});

	// From here on out, JobDefinitions is sorted in. The first in the array will be the first to execute and so on.
	const fullExecTime = JobDefinitions[0].executionTime + ((lastJob.order - JobDefinitions[0].order) * timeOffset)

	// This is the start time of the previous script in ms from the start of the batch execution
	let prevExecTime = 0
	let JobList = []
	for (let jobdef of JobDefinitions) {
		// full execution time - formula - previous exec time = the time between the last and current execution start
		const executionTimeFromPrev = fullExecTime - (jobdef.executionTime + (lastJob.order - jobdef.order) * timeOffset) - prevExecTime

		JobList.push(new Job(jobdef.script, jobdef.executionTime, executionTimeFromPrev, jobdef.ram, null))
		prevExecTime += executionTimeFromPrev
	}
	return { JobList: JobList, executionWindow: (timeOffset * JobList.length), fullExecTime };
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

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
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
 * Function to find the most lucrative server to attack
 * based on admin rights, hacking level, and maximum money available.
 *
 * @param {NS} ns - The Netscript environment (used for accessing Bitburner API)
 * @param {Array} serverList - List of servers to consider for attack (from an import)
 * @returns {Server} - The server with the highest maximum money that meets the conditions
 */
function findBestServerToAttack(ns, serverList) {
	let serverToAttack = "";
	// Loop through the list of servers
	for (let entry of serverList) {
		let serverData = ns.getServer(entry);
		// Check if the server has admin rights and is within hacking level range
		if (serverData.hasAdminRights && (ns.getServerRequiredHackingLevel(entry) * 2 <= ns.getHackingLevel())) {
			// Update serverToAttack if this server has more money than the current best option
			if (serverData.moneyMax > ns.getServerMaxMoney(serverToAttack)) {
				serverToAttack = entry;
			}
		}
	}
	// Return the server with the highest max money that meets the criteria
	return serverToAttack;
}
