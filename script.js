const GEMINI_API_KEY = "AIzaSyAWIgTY4sVtfgCbC9Le0AxvCqo5jI7avb8";
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

async function generateTests() {
  const fileInput = document.getElementById("fileInput");
  const testCount = document.getElementById("testCount").value;
  const loadingDiv = document.getElementById("loading");
  const testContainer = document.getElementById("testContainer");

  if (!fileInput.files[0] || !testCount) {
    showAlert("Please select a file and enter the number of tests", "warning");
    return;
  }

  // Check file size
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (fileInput.files[0].size > maxSize) {
    showAlert("Файлын хэмжээ 5МБ-ээс илүү байна", "warning");
    return;
  }

  loadingDiv.classList.remove("hidden");
  testContainer.innerHTML = "";

  try {
    const fileContent = await readFile(fileInput.files[0]);
    const prompt = `Create ${testCount} multiple choice questions based on this content: "${fileContent}". Each question should have 4 options with only one correct answer. Return ONLY a valid JSON string in this exact format without any additional text or markdown: {"questions":[{"question":"question text","options":["correct answer","wrong answer 1","wrong answer 2","wrong answer 3"],"correctIndex":0}]}`;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const data = await response.json();
    const generatedContent = data.candidates[0].content.parts[0].text;

    let tests;
    try {
      const cleanJson = generatedContent
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      tests = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.log("Raw content:", generatedContent);
      throw new Error("Invalid JSON format received from API");
    }

    if (!tests || !tests.questions || !Array.isArray(tests.questions)) {
      throw new Error("Invalid response format from API");
    }

    displayTests(tests.questions);
    showAlert("Амжилттай үүсгэлээ!", "success");
  } catch (error) {
    console.error("Error:", error);
    showAlert("Алдаа гарлаа. Дахин оролдоно уу.", "danger");
  } finally {
    loadingDiv.classList.add("hidden");
  }
}

async function readFile(file) {
  return new Promise((resolve, reject) => {
    // Check file extension
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
      // Handle Word documents
      const reader = new FileReader();
      reader.onload = async function (event) {
        try {
          const arrayBuffer = event.target.result;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          reject("Error reading Word document: " + error);
        }
      };
      reader.onerror = (error) => reject("Error reading file: " + error);
      reader.readAsArrayBuffer(file);
    } else {
      // Handle other text files
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject("Error reading file: " + e);
      reader.readAsText(file);
    }
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function displayTests(questions) {
  const testContainer = document.getElementById("testContainer");
  testContainer.innerHTML = `
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h3 class="text-center mb-4">Generated Tests</h3>
        <div class="test-content"></div>
      </div>
    </div>
  `;

  const testContent = testContainer.querySelector(".test-content");

  questions.forEach((q, qIndex) => {
    const options = [...q.options];
    shuffleArray(options);
    const correctIndex = options.indexOf(q.options[q.correctIndex]);

    const questionDiv = document.createElement("div");
    questionDiv.className = "question";

    questionDiv.innerHTML = `
      <h4><i class="fas fa-question-circle me-2"></i>Question ${qIndex + 1}</h4>
      <p class="mb-4">${q.question}</p>
      <div class="options">
        ${options
          .map(
            (option, index) => `
          <div class="option d-flex align-items-center" onclick="checkAnswer(this, ${
            index === correctIndex
          })">
            <span class="option-letter me-3">${String.fromCharCode(
              65 + index
            )}.</span>
            <span class="option-text">${option}</span>
            <span class="result-icon ms-auto"></span>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    testContent.appendChild(questionDiv);
  });
}

function checkAnswer(element, isCorrect) {
  const options = element.parentElement.children;
  Array.from(options).forEach((option) => {
    option.onclick = null;
    option.style.cursor = "default";
  });

  if (isCorrect) {
    element.classList.add("correct");
    element.querySelector(".result-icon").innerHTML =
      '<i class="fas fa-check-circle"></i>';
  } else {
    element.classList.add("incorrect");
    element.querySelector(".result-icon").innerHTML =
      '<i class="fas fa-times-circle"></i>';

    Array.from(options).forEach((option) => {
      if (option !== element) {
        const isCorrectOption =
          option.querySelector(".option-text").textContent ===
          element.parentElement
            .querySelector('.option[onclick*="true"]')
            .querySelector(".option-text").textContent;

        if (isCorrectOption) {
          option.classList.add("correct");
          option.querySelector(".result-icon").innerHTML =
            '<i class="fas fa-check-circle"></i>';
        }
      }
    });
  }
}

function showAlert(message, type = "info") {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  const container = document.querySelector(".container");
  container.insertBefore(alertDiv, container.firstChild);

  setTimeout(() => {
    alertDiv.classList.remove("show");
    setTimeout(() => alertDiv.remove(), 150);
  }, 5000);
}
