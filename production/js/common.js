window.onload = function() {
    var protoSlice = Array.prototype.slice; // т.к. часто колекцию юзаю через [].slice.call() решил немного укоротить код

    var detach = function(node) {
        if (node) return node.parentElement.removeChild(node);
        return false;
    };

    (function() {
        /* Сделаем кастомный скроллбар, скроллбар найден на просторах интернетов, умышленно без зависимостей от jQuery
         */
        var tabs = document.querySelectorAll('.tab-section');

        if (tabs.length) protoSlice.call(tabs).forEach(function(item) {
            item.setAttribute('ss-container', true);
        });

        SimpleScrollbar.initAll();
    })();



    (function() {
        /* Делаем возможность добавлять и удалять интересы
         */
        var Store = function(root, name, patern) {
            this._state = [],
                this.name = name,
                this.patern = patern,
                this.rootElement = document.querySelector(root)
        };

        Store.prototype.render = function() {
            this._state;
            this.rootElement.innerHTML = this._state.map(this.patern);
        };

        Store.prototype.getState = function() {
            return this._state;
        };

        Store.prototype.setState = function(data) {
            this._state = typeof data ? data : [];
            localStorage.setItem(this.name, JSON.stringify(data));
            this.render();
        };

        Store.prototype.init = function() {
            var storage = JSON.parse(localStorage.getItem(this.name));

            if (storage !== null) {
                this._state = storage;
                this.render();
            } else {
                var newStore = protoSlice.call(interests.rootElement.children).map(function(item) {
                    return item.children[0].innerText;
                });
                interests.setState(newStore);
            }
        };

        var interests = new Store('.interests__list', 'interests', function(item) {
            return '<li class="interests__item"><a class="interests__link">' + item + '</a></li>';
        });

        interests.init();
        interests.rootElement.addEventListener('click', function(e) {
            e.preventDefault();
            var newState = interests.getState().filter(function(item) {
                return e.target.innerText !== item;
            });

            interests.setState(newState);
        });

        document.querySelector('.form-interest').onsubmit = function(e) {
            e.preventDefault();

            var state = interests.getState(),
                field = this.elements['interest_name'],
                value = field.value.trim().toLowerCase();

            var condition = value && state.every(function(x) {
                return x !== value;
            });

            if (condition) {
                state.unshift(value);
                interests.setState(state);
                field.value = '';
            }

            field.style.outline = condition ? '' : '1px solid red';
        }
    })();


    var tabs = function(selector) {
        /* Делаем простые табы, сложного ничего нет.
         */
        var root = document.querySelectorAll(selector);
        protoSlice.call(root).forEach(function(item, idx) {

            var buttons = protoSlice.call(item.querySelectorAll('.tabs-navigation__link')),
                sections = protoSlice.call(item.querySelectorAll('.tab-section'));

            var switchSection = function(buttonIdx) {
                sections.forEach(function(section, idx) {
                    section.style.display = (idx === buttonIdx) ? 'block' : 'none';
                });
            };

            switchSection(0);

            buttons.forEach(function(button, buttonIdx) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();

                    buttons.forEach(function(button, idx) {
                        button.classList.remove('active');
                    });

                    this.classList.add('active');
                    switchSection(buttonIdx);
                });
            });
        });
    };

    tabs('.tabs');

    var createModal = function(root, handleButton, closeButton) {
        /* делаем собственное модальное окно
          root - это сам элемент для модального окна
          handleButton - элемент для отображения  элемента
          closeButton - элемент по которому будет скрываться элемент
        */

        var modalElementWrapper = document.createElement('div'),
            modalElement = document.createElement('div'),
            overlay = document.createElement('div'),
            btn = document.querySelector(handleButton),
            closeBtn = document.querySelector(closeButton),
            rootElement = document.querySelector(root);

        modalElementWrapper.className = '.modal-wrapper';
        modalElement.className = 'modal';
        overlay.className = 'modal-overlay';
        modalElementWrapper.appendChild(modalElement);
        modalElementWrapper.appendChild(overlay);

        if (rootElement) {
            detach(rootElement);
            modalElement.appendChild(rootElement);

            var closeModal = function(e) {
                e.preventDefault();
                document.body.removeChild(modalElementWrapper);
            }

            btn && btn.addEventListener('click', function(e) {
                e.preventDefault();
                document.body.appendChild(modalElementWrapper);
            });

            closeBtn && closeBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', closeModal);
        }
    };

    createModal('.form-interest', '.add-more', '.js-closemodal');


    /* делаем редактируемые поля
     */
    var editFields = document.querySelectorAll('[data-editable-type]');
    editFields.length && protoSlice.call(editFields).forEach(function(item) {
        item.contentEditable = true;

        var type = item.getAttribute('data-editable-type'),
            inStorage = localStorage.getItem(type),
            itemText = item.innerHTML;


        if (inStorage && itemText !== inStorage) item.innerHTML = inStorage;


        item.onblur = function() {
            var val = this.innerText.trim(),
                style = this.style;

            this.innerHTML = val;

            var set = function(x) {
                style.backgroundColor = (!x) ? "#ff9898" : '';
                if (x) localStorage.setItem(type, val);
            }

            if (type === 'phone') {

                set(val.search(/^((8|\+7)[\- ]?)?(\(?\d{3}\)?[\- ]?)?[\d\- ]{7,10}$/) > -1);

            } else if (type === 'email') {

                var checkEmail = val.search(/^[-\w.]+@([A-z0-9][-A-z0-9]+\.)+[A-z]{2,4}$/) > -1;
                checkEmail && this.setAttribute('href', 'mailto:' + val)
                set(checkEmail);

            } else {

                set(val !== "");

            }
        };
    });
};
