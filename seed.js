// Built-in starter content. The app works with these lessons even before an
// Anthropic API key is configured; the AI generates everything beyond them.

export const TOPICS = [
  {
    id: "english",
    name: "English",
    nameLocal: "अङ्ग्रेजी",
    description: "Learn English step by step, with Nepali support throughout.",
    icon: "अ→A",
    kind: "language",
    levels: ["Beginner", "Elementary", "Intermediate", "Upper-Intermediate", "Advanced"]
  },
  {
    id: "stocks-technical",
    name: "Stock Market — Technical",
    nameLocal: "",
    description: "Charts, candlesticks, trends, indicators and how traders read them.",
    icon: "📈",
    kind: "finance",
    levels: ["Foundations", "Chart Reading", "Indicators", "Strategy", "Advanced"]
  },
  {
    id: "stocks-fundamental",
    name: "Stock Market — Fundamentals",
    nameLocal: "",
    description: "Financial statements, ratios and valuation — judge what a company is worth.",
    icon: "🧾",
    kind: "finance",
    levels: ["Foundations", "Statements", "Ratios", "Valuation", "Advanced"]
  }
];

export const LESSONS = [
  // ---------------------------------------------------------------- english
  {
    id: "english-1",
    topicId: "english",
    level: 1,
    title: "Greetings and Introductions",
    summary: "Say hello, introduce yourself, and ask someone's name — the first conversations you will ever have in English.",
    sections: [
      {
        heading: "Saying hello",
        body: "English has different greetings for different times and situations. \"Hello\" works everywhere and at any time. \"Hi\" is friendly and informal — use it with friends. \"Good morning / afternoon / evening\" are polite and used with elders or at work, similar to how you might use नमस्कार more formally than नमस्ते.",
        example: "Hello! / Hi! / Good morning, sir."
      },
      {
        heading: "Introducing yourself",
        body: "The most common pattern is \"My name is ___\" or simply \"I am ___\". In Nepali you say मेरो नाम ___ हो — notice English puts the verb \"is\" in the middle of the sentence, not at the end.",
        example: "My name is Mira. I am from Kathmandu."
      },
      {
        heading: "Asking about someone",
        body: "To ask a name: \"What is your name?\" (तपाईंको नाम के हो?). To ask how someone is: \"How are you?\" — the usual answer is \"I'm fine, thank you. And you?\". English speakers ask this constantly; it is a greeting more than a real question.",
        example: "A: How are you?  B: I'm fine, thank you. And you?"
      }
    ],
    vocabulary: [
      { term: "Hello", translation: "नमस्ते", example: "Hello! Nice to meet you." },
      { term: "Good morning", translation: "शुभ प्रभात", example: "Good morning, teacher." },
      { term: "My name is …", translation: "मेरो नाम … हो", example: "My name is Sita." },
      { term: "How are you?", translation: "तपाईंलाई कस्तो छ?", example: "How are you today?" },
      { term: "Thank you", translation: "धन्यवाद", example: "Thank you for your help." },
      { term: "Nice to meet you", translation: "तपाईंलाई भेटेर खुसी लाग्यो", example: "Nice to meet you, Ram." }
    ],
    quiz: [
      {
        question: "Which greeting is best for a formal situation in the morning?",
        options: ["Hi!", "Good morning", "Hey", "What's up"],
        answerIndex: 1,
        explanation: "\"Good morning\" is the polite, formal morning greeting. \"Hi\", \"Hey\" and \"What's up\" are informal."
      },
      {
        question: "\"मेरो नाम रमा हो\" in English is:",
        options: ["I name Rama", "My name is Rama", "Rama is name my", "The name Rama"],
        answerIndex: 1,
        explanation: "The pattern is \"My name is ___\". English places the verb \"is\" before the name."
      },
      {
        question: "Someone says \"How are you?\". The most natural reply is:",
        options: ["Yes, I am.", "I'm fine, thank you. And you?", "My name is fine.", "Good morning."],
        answerIndex: 1,
        explanation: "\"I'm fine, thank you. And you?\" answers and politely returns the question."
      }
    ],
    flashcards: [
      { front: "नमस्ते", back: "Hello" },
      { front: "धन्यवाद", back: "Thank you" },
      { front: "तपाईंको नाम के हो?", back: "What is your name?" },
      { front: "तपाईंलाई भेटेर खुसी लाग्यो", back: "Nice to meet you" },
      { front: "शुभ प्रभात", back: "Good morning" }
    ]
  },
  {
    id: "english-2",
    topicId: "english",
    level: 1,
    title: "This, That and Simple Sentences",
    summary: "Build your first real sentences with \"is/are\", \"this/that\", and everyday objects.",
    sections: [
      {
        heading: "This and that",
        body: "\"This\" (यो) points to something near you; \"that\" (त्यो) points to something farther away. Combine with \"is\" to make your first full sentences: This is a book. That is my house.",
        example: "This is a pen. That is a temple."
      },
      {
        heading: "Is, am, are",
        body: "English changes the verb with the subject: I am, you are, he/she/it is, we/they are. Nepali does this too (हुँ, हौ, हो, हुन्), so the idea is familiar — but the English verb comes right after the subject.",
        example: "I am a student. She is a doctor. They are farmers."
      },
      {
        heading: "Making it negative",
        body: "Add \"not\" after the verb: \"This is not my bag.\" \"I am not tired.\" There is no extra word order change — just insert \"not\".",
        example: "That is not water. It is tea."
      }
    ],
    vocabulary: [
      { term: "this / that", translation: "यो / त्यो", example: "This is my phone." },
      { term: "book", translation: "किताब", example: "That book is new." },
      { term: "house", translation: "घर", example: "This is our house." },
      { term: "water", translation: "पानी", example: "This water is cold." },
      { term: "student", translation: "विद्यार्थी", example: "I am a student." }
    ],
    quiz: [
      {
        question: "Choose the correct sentence:",
        options: ["This are my book.", "This is my book.", "This my book is.", "Is this book my."],
        answerIndex: 1,
        explanation: "Singular \"this\" takes \"is\", and English order is subject–verb–rest: This is my book."
      },
      {
        question: "\"त्यो पानी होइन\" in English is:",
        options: ["That is not water.", "This is water not.", "That not is water.", "Water that is not."],
        answerIndex: 0,
        explanation: "\"Not\" goes right after the verb: That is not water."
      },
      {
        question: "Fill in: \"They ___ farmers.\"",
        options: ["is", "am", "are", "be"],
        answerIndex: 2,
        explanation: "We/you/they take \"are\"."
      }
    ],
    flashcards: [
      { front: "यो", back: "this" },
      { front: "त्यो", back: "that" },
      { front: "किताब", back: "book" },
      { front: "घर", back: "house" },
      { front: "म विद्यार्थी हुँ", back: "I am a student" }
    ]
  },
  // ------------------------------------------------------- stocks-technical
  {
    id: "tech-1",
    topicId: "stocks-technical",
    level: 1,
    title: "What a Candlestick Tells You",
    summary: "The candlestick is the basic unit of every price chart. Learn to read one candle before you read a thousand.",
    sections: [
      {
        heading: "The four prices",
        body: "Every candle summarises one period of trading (a day, an hour, a minute) with four prices: Open (first trade), High (highest trade), Low (lowest trade) and Close (last trade). Together these are called OHLC.",
        example: "A daily candle with O=500, H=520, L=495, C=515 means the stock opened at 500 and closed higher at 515."
      },
      {
        heading: "Body and wicks",
        body: "The thick part (body) spans open to close. The thin lines (wicks or shadows) reach to the high and low. A green/white body means the close was above the open (buyers won the period); a red/black body means the close was below the open (sellers won).",
        example: "A long lower wick means sellers pushed price down but buyers pulled it back up before the close — often a sign of buying strength."
      },
      {
        heading: "Body size is conviction",
        body: "A long body shows strong conviction in one direction. A tiny body with long wicks (a \"doji\") shows indecision — buyers and sellers fought to a draw. Single candles matter most at important price levels, not in the middle of nowhere.",
        example: "A doji after a long uptrend can warn that buying momentum is stalling."
      }
    ],
    vocabulary: [
      { term: "OHLC", translation: "Open, High, Low, Close — the four prices in each candle", example: "Check the OHLC before judging the candle." },
      { term: "Body", translation: "The open-to-close range of a candle", example: "A long green body shows strong buying." },
      { term: "Wick / Shadow", translation: "The thin line to the high or low", example: "A long upper wick shows selling pressure at the top." },
      { term: "Doji", translation: "A candle with almost no body — indecision", example: "The market printed a doji at resistance." }
    ],
    quiz: [
      {
        question: "A candle's body shows the range between:",
        options: ["High and low", "Open and close", "Open and high", "Low and close"],
        answerIndex: 1,
        explanation: "The body spans open to close; wicks reach the high and low."
      },
      {
        question: "A long lower wick usually suggests:",
        options: ["Sellers were in full control", "Buyers stepped in after a sell-off", "The stock did not trade", "Volume was zero"],
        answerIndex: 1,
        explanation: "Price fell but was bought back up before the close — buyers absorbed the selling."
      },
      {
        question: "A doji represents:",
        options: ["Strong buying", "Strong selling", "Indecision between buyers and sellers", "A stock split"],
        answerIndex: 2,
        explanation: "Open and close are nearly equal — neither side won the period."
      }
    ],
    flashcards: [
      { front: "OHLC", back: "Open, High, Low, Close" },
      { front: "Green (bullish) candle", back: "Close above open — buyers won the period" },
      { front: "Doji", back: "Tiny body, long wicks — indecision" },
      { front: "Long lower wick", back: "Buyers pushed price back up — possible support" }
    ]
  },
  {
    id: "tech-2",
    topicId: "stocks-technical",
    level: 1,
    title: "Support, Resistance and Trend",
    summary: "Prices remember. Learn the levels where buyers and sellers repeatedly fight, and how to tell which way the market is walking.",
    sections: [
      {
        heading: "Support and resistance",
        body: "Support is a price area where falling prices repeatedly stop and bounce — buyers consistently appear there. Resistance is the opposite: an area where rising prices stall because sellers appear. These are zones, not exact lines.",
        example: "A stock bounces off ~480 three times: 480 is support. It fails near 550 twice: 550 is resistance."
      },
      {
        heading: "Role reversal",
        body: "When price finally breaks through resistance, that old ceiling often becomes the new floor (and vice versa). Traders call this role reversal, and it is one of the most reliable ideas in charting.",
        example: "After breaking above 550, the stock pulls back to 550 and bounces — old resistance acting as new support."
      },
      {
        heading: "Trend: higher highs, higher lows",
        body: "An uptrend is a staircase of higher highs and higher lows. A downtrend is lower highs and lower lows. If you cannot clearly see either, the market is ranging — and most trend-following strategies should sit out.",
        example: "Lows at 480 → 495 → 510 with rising peaks = an uptrend."
      }
    ],
    vocabulary: [
      { term: "Support", translation: "Price zone where falling price tends to bounce", example: "Buy interest appears at support." },
      { term: "Resistance", translation: "Price zone where rising price tends to stall", example: "The rally failed at resistance." },
      { term: "Breakout", translation: "Price closing beyond support/resistance", example: "The breakout above 550 came on high volume." },
      { term: "Uptrend", translation: "Higher highs and higher lows", example: "Stay with the uptrend until it breaks." }
    ],
    quiz: [
      {
        question: "Support is best described as:",
        options: ["An exact price where stocks always bounce", "A zone where buyers have repeatedly appeared", "The highest price ever", "A government price control"],
        answerIndex: 1,
        explanation: "Support is a zone of repeated buying interest — not a magic exact number."
      },
      {
        question: "After a breakout above resistance, that level often:",
        options: ["Disappears forever", "Becomes support", "Becomes stronger resistance", "Halts trading"],
        answerIndex: 1,
        explanation: "Role reversal: old resistance frequently becomes new support."
      },
      {
        question: "An uptrend is defined by:",
        options: ["Higher highs and higher lows", "Lower highs and lower lows", "Equal highs and lows", "High volume only"],
        answerIndex: 0,
        explanation: "The staircase of higher highs and higher lows is the classic definition."
      }
    ],
    flashcards: [
      { front: "Support", back: "Zone where falling price tends to bounce (buyers appear)" },
      { front: "Resistance", back: "Zone where rising price tends to stall (sellers appear)" },
      { front: "Role reversal", back: "Broken resistance becomes support, and vice versa" },
      { front: "Uptrend", back: "Higher highs + higher lows" }
    ]
  },
  // ----------------------------------------------------- stocks-fundamental
  {
    id: "fund-1",
    topicId: "stocks-fundamental",
    level: 1,
    title: "The Three Financial Statements",
    summary: "Every listed company publishes three reports. Together they answer: what does it own, what did it earn, and where did the cash go?",
    sections: [
      {
        heading: "Balance sheet — what it owns and owes",
        body: "A snapshot at one date. Assets (what the company owns) = Liabilities (what it owes) + Equity (what belongs to shareholders). If a company has 10 crore in assets and 6 crore in liabilities, shareholders' equity is 4 crore.",
        example: "Assets 10cr = Liabilities 6cr + Equity 4cr."
      },
      {
        heading: "Income statement — what it earned",
        body: "A movie over a period (quarter or year): Revenue (sales) minus expenses gives Net Profit. Watch the path: Revenue → Gross Profit → Operating Profit → Net Profit. Each step reveals a different kind of cost.",
        example: "Revenue 5cr − costs 4cr = Net profit 1cr for the year."
      },
      {
        heading: "Cash flow statement — where cash actually moved",
        body: "Profit is an opinion; cash is a fact. This statement splits cash movement into Operating (the core business), Investing (buying/selling assets) and Financing (loans, shares, dividends). A profitable company that never generates operating cash is a red flag.",
        example: "Net profit 1cr but operating cash flow −0.5cr → customers are not actually paying yet."
      }
    ],
    vocabulary: [
      { term: "Asset", translation: "Something the company owns with value", example: "Cash, buildings and inventory are assets." },
      { term: "Liability", translation: "Something the company owes", example: "Bank loans are liabilities." },
      { term: "Equity", translation: "Assets minus liabilities — the shareholders' part", example: "Book value is another name for equity." },
      { term: "Revenue", translation: "Total sales before any costs", example: "Revenue grew 20% this year." },
      { term: "Net profit", translation: "What remains after all expenses and taxes", example: "Net profit margin = net profit ÷ revenue." }
    ],
    quiz: [
      {
        question: "The balance sheet equation is:",
        options: ["Assets = Liabilities + Equity", "Revenue = Costs + Profit", "Cash = Profit − Tax", "Equity = Assets + Liabilities"],
        answerIndex: 0,
        explanation: "Assets are financed either by borrowing (liabilities) or by owners (equity)."
      },
      {
        question: "Which statement covers a period of time rather than a single date?",
        options: ["Balance sheet", "Income statement", "Shareholder register", "None of them"],
        answerIndex: 1,
        explanation: "The income statement (and cash flow statement) cover a period; the balance sheet is a snapshot."
      },
      {
        question: "A company reports profit but negative operating cash flow. This suggests:",
        options: ["Nothing unusual ever", "It may be booking sales it hasn't collected", "It must be fraud-free", "Its equity is zero"],
        answerIndex: 1,
        explanation: "Profit without cash often means receivables piling up — sales recorded but money not collected."
      }
    ],
    flashcards: [
      { front: "Balance sheet", back: "Snapshot: Assets = Liabilities + Equity" },
      { front: "Income statement", back: "Period: Revenue − Expenses = Net profit" },
      { front: "Cash flow statement", back: "Where cash moved: Operating / Investing / Financing" },
      { front: "Equity", back: "Assets − Liabilities (shareholders' share)" }
    ]
  },
  {
    id: "fund-2",
    topicId: "stocks-fundamental",
    level: 1,
    title: "P/E, EPS and Your First Ratios",
    summary: "Ratios turn raw statements into comparisons. Learn EPS, P/E and book value — the three numbers every investor quotes.",
    sections: [
      {
        heading: "EPS — earnings per share",
        body: "EPS = Net profit ÷ number of shares. It converts company-level profit into a per-share number you can compare with the share price. A company earning 2cr with 1 crore shares has an EPS of Rs 2.",
        example: "Net profit 2cr ÷ 1cr shares = EPS Rs 2."
      },
      {
        heading: "P/E — the price of one rupee of earnings",
        body: "P/E = Share price ÷ EPS. It answers: how many rupees am I paying for one rupee of annual earnings? A P/E of 20 means you pay Rs 20 for Rs 1 of yearly profit. High P/E can mean the market expects growth — or that the stock is expensive.",
        example: "Price 300 ÷ EPS 15 = P/E of 20."
      },
      {
        heading: "Book value and P/B",
        body: "Book value per share = Equity ÷ shares: what each share would theoretically get if the company liquidated today. P/B compares price to that. Banks and asset-heavy companies are often judged on P/B; fast-growing tech rarely is.",
        example: "Equity 4cr ÷ 1cr shares = book value Rs 4 per share."
      }
    ],
    vocabulary: [
      { term: "EPS", translation: "Net profit ÷ shares outstanding", example: "EPS rose from Rs 12 to Rs 15." },
      { term: "P/E ratio", translation: "Price ÷ EPS — price of one rupee of earnings", example: "The sector trades at a P/E of 18." },
      { term: "Book value", translation: "Equity per share", example: "The stock trades below book value." },
      { term: "P/B ratio", translation: "Price ÷ book value per share", example: "A P/B under 1 can signal undervaluation — or trouble." }
    ],
    quiz: [
      {
        question: "A company earns 3cr with 1.5cr shares. EPS is:",
        options: ["Rs 4.5", "Rs 2", "Rs 3", "Rs 0.5"],
        answerIndex: 1,
        explanation: "3cr ÷ 1.5cr shares = Rs 2 per share."
      },
      {
        question: "Price is Rs 400, EPS is Rs 20. The P/E is:",
        options: ["8000", "20", "0.05", "420"],
        answerIndex: 1,
        explanation: "400 ÷ 20 = 20: you pay Rs 20 per rupee of annual earnings."
      },
      {
        question: "A very high P/E most safely means:",
        options: ["The stock is guaranteed to fall", "The market expects strong future growth (or the stock is expensive)", "The company is bankrupt", "EPS is negative"],
        answerIndex: 1,
        explanation: "High P/E prices in expectations — it is a warning to check whether the growth is real, not an automatic sell signal."
      }
    ],
    flashcards: [
      { front: "EPS", back: "Net profit ÷ shares outstanding" },
      { front: "P/E", back: "Price ÷ EPS — rupees paid per rupee of earnings" },
      { front: "Book value/share", back: "Equity ÷ shares outstanding" },
      { front: "P/B", back: "Price ÷ book value per share" }
    ]
  }
];
