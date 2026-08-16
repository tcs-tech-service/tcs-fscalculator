# PySide6 Searchable CSV Input — Single-Column Implementation

## Purpose

Implement a reusable PySide6 input widget that allows a user to:

- Type a value manually.
- See matching values from a single-column CSV while typing.
- Scroll through matching values.
- Select a CSV value with the mouse or keyboard.
- Press Enter to accept a CSV value.
- Enter a value that does not exist in the CSV as a custom value.
- Determine programmatically whether the final value came from the CSV or is custom.
- Reuse the widget for multiple fields.

This implementation intentionally supports **one CSV column only**.

---

## 1. Install PySide6

```bash
pip install PySide6
```

---

## 2. CSV Format

Use a CSV containing one value per row.

Example `parts.csv`:

```text
ABC-100
ABC-101
ABC-102
ABC-103
ABC-104
ABC-200
ABC-201
DEF-100
DEF-101
DEF-200
XYZ-001
XYZ-002
```

The first CSV column is used. Blank rows are ignored and duplicate values are removed.

---

## 3. Reusable Widget

Create a Python file named:

```text
autocomplete_input.py
```

Use this implementation:

```python
import csv

from PySide6.QtCore import Qt, QPoint
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
)


class AutoCompleteInput(QWidget):

    def __init__(
        self,
        csv_file,
        column=0,
        placeholder="Type or select...",
        max_results=100,
    ):
        super().__init__()

        self.csv_file = csv_file
        self.column = column
        self.max_results = max_results

        self.values = []
        self.custom_value = False

        self.edit = QLineEdit()
        self.edit.setPlaceholderText(placeholder)

        self.popup = QListWidget()
        self.popup.setWindowFlags(Qt.Popup)
        self.popup.setFocusPolicy(Qt.NoFocus)
        self.popup.setMaximumHeight(250)

        self.load_csv()

        self.edit.textChanged.connect(self.on_text_changed)
        self.edit.returnPressed.connect(self.accept_value)
        self.popup.itemClicked.connect(self.select_item)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.edit)

    def load_csv(self):
        self.values.clear()

        try:
            with open(
                self.csv_file,
                "r",
                encoding="utf-8-sig",
                newline="",
            ) as file:

                reader = csv.reader(file)

                for row in reader:

                    if len(row) <= self.column:
                        continue

                    value = row[self.column].strip()

                    if value:
                        self.values.append(value)

        except FileNotFoundError:
            print(f"CSV file not found: {self.csv_file}")

        self.values = list(dict.fromkeys(self.values))

    def on_text_changed(self, text):
        text = text.strip()

        if not text:
            self.hide_popup()
            return

        search = text.lower()

        matches = [
            value
            for value in self.values
            if search in value.lower()
        ]

        matches = matches[:self.max_results]

        self.popup.clear()

        for value in matches:
            item = QListWidgetItem(value)
            self.popup.addItem(item)

        if not matches:
            item = QListWidgetItem(
                f'Use "{text}" as custom value'
            )
            item.setData(Qt.UserRole, "CUSTOM")
            self.popup.addItem(item)

        self.show_popup()

    def show_popup(self):
        if self.popup.count() == 0:
            return

        position = self.edit.mapToGlobal(
            QPoint(0, self.edit.height())
        )

        self.popup.move(position)
        self.popup.setFixedWidth(self.edit.width())
        self.popup.show()
        self.popup.setCurrentRow(0)

    def hide_popup(self):
        self.popup.hide()

    def select_item(self, item):
        custom = item.data(Qt.UserRole)

        if custom == "CUSTOM":
            value = self.edit.text().strip()
            self.custom_value = True
            self.edit.setText(value)
        else:
            self.custom_value = False
            self.edit.setText(item.text())

        self.hide_popup()
        self.edit.setFocus()

    def accept_value(self):
        if not self.popup.isVisible():
            self.check_value()
            return

        item = self.popup.currentItem()

        if item is None:
            self.check_value()
            return

        custom = item.data(Qt.UserRole)

        if custom == "CUSTOM":
            self.custom_value = True
            self.hide_popup()
            return

        self.custom_value = False
        self.edit.setText(item.text())
        self.hide_popup()

    def check_value(self):
        value = self.edit.text().strip()

        if not value:
            self.custom_value = False
            return

        self.custom_value = value not in self.values

    def value(self):
        return self.edit.text().strip()

    def is_custom(self):
        self.check_value()
        return self.custom_value

    def set_value(self, value):
        self.edit.setText(str(value))
        self.check_value()

    def clear(self):
        self.edit.clear()
        self.custom_value = False
        self.hide_popup()

    def keyPressEvent(self, event):
        key = event.key()

        if key == Qt.Key_Down:
            if self.popup.isVisible():
                current = self.popup.currentRow()

                if current < self.popup.count() - 1:
                    self.popup.setCurrentRow(current + 1)

                return

        if key == Qt.Key_Up:
            if self.popup.isVisible():
                current = self.popup.currentRow()

                if current > 0:
                    self.popup.setCurrentRow(current - 1)

                return

        if key == Qt.Key_Escape:
            self.hide_popup()
            return

        super().keyPressEvent(event)
```

---

## 4. Example Main Application

Create:

```text
main.py
```

Use:

```python
import sys

from PySide6.QtWidgets import (
    QApplication,
    QWidget,
    QVBoxLayout,
    QLabel,
    QPushButton,
)

from autocomplete_input import AutoCompleteInput


class MainWindow(QWidget):

    def __init__(self):
        super().__init__()

        self.setWindowTitle("CSV Searchable Input")
        self.resize(500, 300)

        layout = QVBoxLayout(self)

        layout.addWidget(QLabel("Part Number"))

        self.part_number = AutoCompleteInput(
            csv_file="parts.csv",
            column=0,
            placeholder="Enter part number...",
        )

        layout.addWidget(self.part_number)

        button = QPushButton("Get Value")
        button.clicked.connect(self.get_value)

        layout.addWidget(button)

    def get_value(self):
        value = self.part_number.value()
        custom = self.part_number.is_custom()

        print("Value:", value)
        print("Custom:", custom)


if __name__ == "__main__":

    app = QApplication(sys.argv)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())
```

---

## 5. Directory Structure

```text
project/
│
├── main.py
├── autocomplete_input.py
└── parts.csv
```

Run:

```bash
python main.py
```

---

## 6. User Interaction

If the user types:

```text
ABC
```

the popup displays matching values such as:

```text
ABC-100
ABC-101
ABC-102
ABC-103
ABC-104
ABC-200
ABC-201
```

The list is scrollable when there are more results than fit in the popup.

The user can:

- Click a value.
- Press Down/Up to move through results.
- Press Enter to select the highlighted value.
- Press Escape to close the popup.

For `ABC-102`:

```python
self.part_number.value()
```

returns:

```text
ABC-102
```

and:

```python
self.part_number.is_custom()
```

returns:

```text
False
```

---

## 7. Custom Value

If the user types:

```text
ABC-999
```

and that value does not exist in the CSV, the popup displays:

```text
Use "ABC-999" as custom value
```

Pressing Enter accepts the value.

Then:

```python
self.part_number.value()
```

returns:

```text
ABC-999
```

and:

```python
self.part_number.is_custom()
```

returns:

```text
True
```

---

## 8. Multiple Fields

The same single-column widget can be reused for multiple fields:

```python
self.part_number = AutoCompleteInput(
    "parts.csv",
    placeholder="Enter part number..."
)

self.tool_number = AutoCompleteInput(
    "tools.csv",
    placeholder="Enter tool number..."
)

self.material = AutoCompleteInput(
    "materials.csv",
    placeholder="Enter material..."
)
```

Each field can therefore have its own one-column CSV.

---

## 9. Matching Behavior

The current implementation uses case-insensitive substring matching:

```python
if search in value.lower()
```

Therefore, entering:

```text
102
```

can find:

```text
ABC-102
XYZ-102
TOOL-102
```

For structured identifiers such as part numbers or tool numbers, starts-with matching may be preferable:

```python
if value.lower().startswith(search)
```

Then typing:

```text
ABC
```

shows:

```text
ABC-100
ABC-101
ABC-102
ABC-200
```

but typing:

```text
102
```

does not show `ABC-102`.

---

## 10. Recommended Architecture

Keep the autocomplete widget independent from the rest of the application:

```text
main.py
   │
   ├── Part Number → AutoCompleteInput → parts.csv
   │
   ├── Tool Number → AutoCompleteInput → tools.csv
   │
   └── Material    → AutoCompleteInput → materials.csv
```

The main application only needs:

```python
value = widget.value()
custom = widget.is_custom()
```

This keeps the GUI code clean and makes the autocomplete component reusable throughout the project.

---

## 11. Future Enhancements

Possible additions include:

1. CSV reload without restarting.
2. Minimum search length.
3. Maximum result count.
4. Alphabetical/numeric sorting.
5. Exact-match priority.
6. Visual indication of custom values.
7. CSV file selection from the GUI.
8. Optional persistence of custom values.
9. Input validation.
10. Integration with the existing PCB/Excellon application.
