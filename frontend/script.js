// Candidate List (with image & bio)
const candidates = [
  {
    name: "Alice",
    image: "assets/alice.jpg",
    bio: "Blockchain Engineer. Transparency Advocate."
  },
  {
    name: "Bob",
    image: "assets/bob.jpg",
    bio: "Policy Expert. Supports educational reform."
  },
  {
    name: "Charlie",
    image: "assets/charlie.jpg",
    bio: "Student Leader. Campaigns for lower fees."
  }
];

// Populate candidate dropdown on page load
window.onload = () => {
  const select = document.getElementById("candidates");
  candidates.forEach((c, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.innerText = c.name;
    select.appendChild(option);
  });
};

//Show image preview on upload
function previewImage() {
  const file = document.getElementById("faceInput").files[0];
  const preview = document.getElementById("preview");
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  }
}

// Show selected candidate details
function showCandidateInfo() {
  const index = document.getElementById("candidates").value;
  const candidate = candidates[index];

  document.getElementById("candidateImage").src = candidate.image;
  document.getElementById("candidateBio").innerText = candidate.bio;
  document.getElementById("candidateInfo").style.display = "block";
}

// Toast Notification
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = "show";
  setTimeout(() => (toast.className = toast.className.replace("show", "")), 3000);
}

// Face & Age Verification
async function verifyFace() {
  const faceInput = document.getElementById("faceInput");
  const birthdateInput = document.getElementById("birthdate");

  if (!faceInput.files[0]) return showToast("Please upload a face image.");
  if (!birthdateInput.value) return showToast("Please enter your birthdate.");

  const birthDate = new Date(birthdateInput.value);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  if (age < 18) return showToast("You must be at least 18 to vote.");

  const formData = new FormData();
  formData.append("face", faceInput.files[0]);

  try {
    const res = await fetch("/verify", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.verified) {
      showToast("Face verified successfully!");
      document.getElementById("voteSection").style.display = "block";
      document.getElementById("leaderboard").style.display = "block";
      loadVoteResults();
    } else {
      showToast("❌ Face verification failed.");
    }
  } catch (err) {
    console.error("Verification Error:", err);
    showToast("❌ Error during verification.");
  }
}

// Cast Vote via Web3
async function vote() {
  const selected = document.getElementById("candidates").value;
  if (selected === "") return showToast("Please select a candidate to vote.");

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

  // Replace with your deployed contract values
  const contractAddress = "0xYourDeployedContractAddress"; // <-- PUT YOUR CONTRACT ADDRESS HERE
  const contractABI = [ /* <-- YOUR ABI GOES HERE */ ];

  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(contractABI, contractAddress);

  try {
    await contract.methods.vote(parseInt(selected)).send({
      from: accounts[0]
    });

    showToast("🎉 Vote submitted successfully!");
    loadVoteResults();
  } catch (err) {
    console.error("Voting Error:", err);
    showToast("❌ Vote failed. Try again.");
  }
}

// Load Vote Counts from Smart Contract
async function loadVoteResults() {
  const contractAddress = "0xYourDeployedContractAddress"; // <-- SAME AS ABOVE
  const contractABI = [ /* <-- YOUR ABI AGAIN */ ];

  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(contractABI, contractAddress);

  const ul = document.getElementById("voteResults");
  ul.innerHTML = "";

  for (let i = 0; i < candidates.length; i++) {
    const count = await contract.methods.getVotes(i).call();
    const li = document.createElement("li");
    li.textContent = `${candidates[i].name}: ${count} vote(s)`;
    ul.appendChild(li);
  }
}

document.getElementById("finishVote").addEventListener("click", () => {
  // Clear active voter locally (you could also send a logout request if you used sessions)
  document.getElementById("logoutMessage").textContent = "✅ Your vote has been successfully recorded.";

  setTimeout(() => {
    window.location.href = "/register.html";
  }, 2000);
});

