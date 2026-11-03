/*
  projects.js is the only file you edit to change the projects on the site.
  index.html reads this list and draws one card per entry, in the same order.

  To add a project, copy one block below, paste it where you want it to appear,
  and change the text. Do not forget the comma after the closing brace.

  Fields:
    title        the heading of the card
    flag         small label next to the title, for example "MSc final project" (optional)
    description  one short paragraph
    tags         a list of small labels at the bottom
    links        buttons on the card. Each one is { label: "text", url: "address" }.
                 A full address (https://...) goes to another site, and a path such as
                 reports/name.pdf goes to a file in this repo.
    note         plain grey text shown only when there are no links yet, for example "Academic report"

  To publish a report, put the PDF in the reports folder, then add a link to the project:
    links: [{ label: "Read the report (PDF)", url: "reports/name.pdf" }],
*/
window.SITE_PROJECTS = [

  {
    title: "SecurePass Analyzer",
    description: "A password auditing tool that scores real strength with zxcvbn and checks a password against the Have I Been Pwned breach set using k-anonymity, so the password never leaves the machine. Also generates strong passwords and passphrases.",
    tags: ["Python", "Streamlit", "HIBP API"],
    links: [{ label: "View on GitHub →", url: "https://github.com/Elishane786/securepass-analyzer" }]
  },

  {
    title: "Job Search Discord Bot",
    flag: "new",
    description: "A private Discord bot that searches Reed and Adzuna for security roles, scores every job against my resume and keywords, and posts the strongest matches with a match percentage, strongest first. Runs a search on a slash command and once a day, and a webhook lets any script ping my server. Covered by automated tests, with secrets kept out of git.",
    tags: ["Python", "discord.py", "REST APIs", "pytest"],
    links: [{ label: "View on GitHub →", url: "https://github.com/Elishane786/discord-job-bot" }]
  },

  {
    title: "2D Dungeon Adventure",
    description: "A pixel-art dungeon platformer built in Unity with C#. My own gameplay systems: arrow firing and spawning, doors and keys, chests, traps, a dialogue and story flow, and hand-built levels from a start menu through to the end.",
    tags: ["Unity", "C#", "Game dev"],
    links: [{ label: "View on GitHub →", url: "https://github.com/Elishane786/2d-dungeon-adventure" }]
  },

  {
    title: "Testing Windows Code Integrity",
    flag: "MSc final project",
    description: "Does a Microsoft signature prove a driver is safe? I tested it on a Windows 10 machine, using an administrator account and signed software only. The signed forensic driver WinPmem handed over all of physical memory, including the contents of processes that had already closed, but every attempt to write crashed the machine before the target value changed, and what stopped it was a kernel safety check and not the signature. VBS and HVCI were not tested. Defended in viva.",
    tags: ["Windows internals", "Physical memory", "WinPmem", "C++"],
    links: [
      { label: "Read the report (PDF)", url: "https://github.com/Elishane786/testing-windows-code-integrity/blob/main/report/final-report.pdf" },
      { label: "View on GitHub →", url: "https://github.com/Elishane786/testing-windows-code-integrity" }
    ]
  },

  {
    title: "ChatGPT Ethical Hacking",
    flag: "Bachelor thesis",
    description: "Built a suite of AI-assisted tools that automate penetration testing end to end: you give it a target IP, it runs an Nmap scan, sends the results to ChatGPT, which suggests a Metasploit exploit to run, then runs it and has ChatGPT write up the report. Also built phishing simulation tools, fake login pages and email generators, for cybersecurity awareness training. Tested in an isolated lab against Metasploitable2.",
    tags: ["Python", "OpenAI API", "Metasploit", "Nmap", "Social engineering"],
    links: [{ label: "View on GitHub →", url: "https://github.com/Elishane786/chatgpt-ethical-hacking" }]
  },

  {
    title: "EZVIZ C6N Camera Pentest",
    flag: "group project",
    description: "Security assessment of a consumer IoT camera for an MSc group project, looking at the device, its app, and its network traffic. I helped run the testing and wrote up the findings into a formal penetration test report.",
    tags: ["IoT security", "Pentesting", "Reporting"],
    links: [],
    note: "Assessment report"
    // when the report is ready: links: [{ label: "Read the report (PDF)", url: "reports/ezviz-c6n-pentest-report.pdf" }],
  },

  {
    title: "ICS & Digital-Twin Security",
    flag: "research",
    description: "My main research direction: security of industrial control systems. Manipulating PLCs over Snap7, modelling a plant with Factory I/O, and looking at how a digital twin can be attacked or used to defend the real process.",
    tags: ["ICS / OT", "PLC / Snap7", "Factory I/O"],
    links: [],
    note: "Research"
  },

  {
    title: "CTF & Exploitation",
    description: "Ongoing capture-the-flag work across binary exploitation, reverse engineering and cryptography challenges, including memory-dump and pwn problems. Where competition results came from this, they are listed below.",
    tags: ["Reverse engineering", "pwn", "Crypto"],
    links: [],
    note: "Practice"
  }

];
