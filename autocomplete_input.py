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
