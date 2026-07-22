# Visión de Rukai

## Norte del producto

Rukai será un motor para crear y reproducir clases interactivas generadas con
inteligencia artificial. Su objetivo es convertir una clase en una experiencia
visual, narrada y participativa en la que el estudiante no solo consume
contenido: responde, demuestra lo que entiende y recibe una experiencia que se
adapta a sus necesidades.

Toda decisión de producto, diseño y arquitectura debe acercar el proyecto a
esta experiencia.

## La experiencia del estudiante

El punto central de la clase será un canvas. No tiene que ser un elemento
`canvas` nativo de HTML: el término describe la superficie visual donde se
presentará el contenido.

Este canvas cumplirá una función similar a una presentación de PowerPoint o
Google Slides, pero el estudiante no navegará libremente entre diapositivas.
La clase avanzará como una experiencia continua, parecida a un video, mientras
el sistema controla la secuencia y el momento en que aparece cada elemento.

Al entrar a una clase, el estudiante encontrará:

1. El canvas preparado para reproducir la lección.
2. Un botón para empezar.
3. Una experiencia guiada que comienza después de esa acción explícita.

Durante la reproducción, el canvas podrá mostrar de manera sincronizada:

- texto;
- imágenes;
- ilustraciones y recursos visuales;
- gráficas y visualizaciones de datos;
- cualquier otro material que facilite la comprensión del tema.

La presentación estará acompañada por una voz en off en español, generada con
un modelo de texto a voz de OpenAI. La narración y la composición visual deben
sentirse como una sola clase, no como dos experiencias independientes.

## Una clase no linealmente pasiva

Aunque la reproducción se perciba como un video, no será un archivo de video
ni una secuencia completamente pasiva. Será una presentación dinámica capaz de
detenerse en momentos definidos para pedir la participación del estudiante.

En esas interrupciones, la narración se pausará y el canvas mostrará una
actividad. Entre los formatos de interacción previstos están:

- respuestas de texto libre;
- selección simple;
- verdadero o falso;
- otros controles que permitan comprobar o estimular el aprendizaje.

El estudiante responderá dentro de la misma superficie de la clase, sin romper
la continuidad de la experiencia.

## El papel de la inteligencia artificial

La inteligencia artificial no se limitará a generar la narración. También
recibirá las respuestas del estudiante, interpretará su significado y decidirá
cómo debe continuar la clase.

Según la interacción, el motor podrá, por ejemplo:

- continuar con el siguiente segmento cuando exista comprensión suficiente;
- ofrecer una explicación adicional cuando detecte dudas;
- reformular un concepto;
- mostrar otro ejemplo o apoyo visual;
- hacer una nueva pregunta para comprobar el aprendizaje.

Por tanto, la ruta de una clase podrá variar según lo que cada estudiante vaya
demostrando. La meta no es reproducir siempre la misma secuencia, sino sostener
un diálogo pedagógico dentro de una experiencia visual guiada.

## Modelo conceptual de una clase

Una clase debe poder entenderse como una secuencia de segmentos. Cada segmento
combina uno o más de estos elementos:

- una escena visual presentada en el canvas;
- un fragmento de narración;
- cambios temporizados dentro de la escena;
- una pausa de interacción opcional;
- una regla o decisión sobre cómo continuar según la respuesta.

Este modelo deberá permitir que el motor coordine presentación, audio,
interacción y adaptación sin convertir la clase en un video rígido.

## Principios rectores

1. **La experiencia es guiada.** El ritmo y la secuencia pertenecen a la clase,
   aunque el estudiante pueda pausar o participar cuando corresponda.
2. **La interacción es parte de la lección.** Las preguntas no son una capa
   separada ni un examen al final; aparecen dentro del flujo pedagógico.
3. **La respuesta tiene consecuencias.** Pedir información al estudiante solo
   tiene sentido si el sistema puede interpretarla y actuar en consecuencia.
4. **Lo visual apoya el aprendizaje.** Texto, imágenes y gráficas deben aclarar
   la explicación, no decorar el canvas.
5. **Narración y escena permanecen sincronizadas.** Lo que se escucha y lo que
   aparece en pantalla deben formar una experiencia coherente.
6. **La continuidad importa.** Las transiciones entre explicación, pregunta,
   respuesta y continuación deben sentirse naturales.
7. **El español es un requisito central.** La voz, el contenido y la interacción
   deben ofrecer una experiencia de alta calidad en español.
8. **La arquitectura debe conservar la adaptabilidad.** Las decisiones técnicas
   no deben encerrar las clases en una secuencia lineal imposible de ajustar.

## Criterio para decisiones futuras

Cuando existan varias opciones de implementación, se debe favorecer la que
mejor permita crear una clase visual, narrada, interactiva y adaptable. Un
avance aislado puede ser pequeño, pero debe conservar un camino claro hacia el
motor descrito en este documento.

Este archivo es la fuente de verdad de la visión del producto. Debe consultarse
antes de planear o implementar cambios relevantes y actualizarse cuando la
visión del producto cambie de forma explícita.
