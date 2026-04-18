// Auto-scroll and scrape script
// We use the public 'ais-pre-' URL to bypass the dev environment's authentication proxy
const API_URL = "http://localhost:3000/api/analyze";
const processedPosts = new Set();

async function analyzePost(postElement) {
  try {
    const textElement = postElement.querySelector('[data-testid="tweetText"]');
    const userElement = postElement.querySelector('[data-testid="User-Name"]');
    
    if (!textElement || !userElement) return;
    
    const text = textElement.innerText;
    const username = userElement.innerText.split('\n')[0];
    
    // Extract Native X Status ID (globally unique)
    const statusLink = postElement.querySelector('a[href*="/status/"]');
    let postId = "";
    if (statusLink) {
      const parts = statusLink.getAttribute('href').split('/status/');
      if (parts.length > 1) {
        postId = parts[1].split('?')[0]; // Extract numeric ID
      }
    }
    
    // Fallback Hash (if ID not found)
    if (!postId) {
      postId = btoa(unescape(encodeURIComponent(text.substring(0, 30) + username))).substring(0, 20);
    }
    
    if (processedPosts.has(postId)) return;
    processedPosts.add(postId);
    
    // Parse likes and views
    const parseCount = (str) => {
      if (!str) return 0;
      // Extract the first number found (handling commas like 3,456)
      const match = str.replace(/,/g, '').match(/[\d.]+/);
      if (!match) return 0;
      let num = parseFloat(match[0]);
      const lowerStr = str.toLowerCase();
      if (lowerStr.includes('k')) num *= 1000;
      if (lowerStr.includes('m')) num *= 1000000;
      return Math.floor(num);
    };
    
    const likeBtn = postElement.querySelector('[data-testid="like"]');
    const likes = parseCount(likeBtn ? (likeBtn.getAttribute('aria-label')) : '0');
    
    // X View count is often in an anchor with /analytics or a div with data-testid="app-text-transition-container"
    const analyticsBtn = postElement.querySelector('a[href*="/analytics"]');
    const viewText = analyticsBtn ? (analyticsBtn.getAttribute('aria-label') || analyticsBtn.innerText) : '0';
    const views = parseCount(viewText);
    
    const replyBtn = postElement.querySelector('[data-testid="reply"]');
    const comments = parseCount(replyBtn ? (replyBtn.getAttribute('aria-label') || replyBtn.innerText) : '0');
    
    console.log(`[X-Analyzer] Sending post by ${username} to backend...`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        postId: postId,
        username: username,
        text: text,
        likes: likes,
        views: views,
        comments: comments,
        timestamp: Date.now()
      })
    });
    
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      postElement.style.borderLeft = "4px solid #ef4444";
      return;
    }
    
    if (response.ok) {
      postElement.style.borderLeft = "4px solid #3b82f6";
    } else {
      postElement.style.borderLeft = "4px solid #ef4444";
    }
    
  } catch (err) {
    console.error("[X-Analyzer] Fetch error:", err);
  }
}

async function scanPosts() {
  const posts = document.querySelectorAll('[data-testid="tweet"]');
  if (posts.length === 0) return;
  
  for (const post of posts) {
    await analyzePost(post);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function loop() {
  await scanPosts();
  window.scrollBy(0, 800);
  setTimeout(loop, 5000);
}
loop();
console.log("[X-Analyzer] Extension Loaded! Target API:", API_URL);